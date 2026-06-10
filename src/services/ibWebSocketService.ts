import {
  setConnecting,
  setConnected,
  setDisconnected,
  setError,
  incrementReconnectAttempts,
  resetReconnectAttempts,
} from '../store/slices/ibConnectionSlice';
import { isLocalHostname, isValidIBMessage, isValidPort } from './websocketValidation';

// Store reference - injected from main.tsx (same pattern as priceWebSocketService).
// Avoids importing a module-level singleton store that wouldn't hold user data.
let storeInstance: any = null;

export const initializeIBWebSocketService = (store: any) => {
  storeInstance = store;
};

const store = {
  getState: () => storeInstance?.getState(),
  dispatch: (action: any) => storeInstance?.dispatch(action),
};

export interface IBConfig {
  host: string;
  port: number;
  clientId: number;
}

export interface IBMarketDataRequest {
  ticker: string;
  exchange?: string;
  secType?: 'STK' | 'OPT' | 'FUT';
  currency?: string;
}

export interface IBMarketDataResponse {
  ticker: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: number;
}

export interface IBOptionChainRequest {
  ticker: string;
  expiration?: string;
  strikes?: number[];
}

export interface IBOptionData {
  strike: number;
  expiration: string;
  type: 'CALL' | 'PUT';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVol: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

class IBWebSocketService {
  private ws: WebSocket | null = null;
  private config: IBConfig;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private pendingRequests: Map<
    number,
    { resolve: (value: any) => void; reject: (reason: any) => void }
  > = new Map();
  private requestId = 0;
  // Warn only once for malformed incoming messages to avoid console storms.
  private warnedInvalidMessage = false;

  constructor(config?: Partial<IBConfig>) {
    this.config = this.sanitizeConfig({
      host: config?.host || '127.0.0.1',
      port: config?.port || 7496, // TWS live trading port by default
      clientId: config?.clientId || 9,
    });
  }

  /**
   * The IB TWS bridge is localhost-only by design: enforce a loopback host
   * and a valid port so a tampered config cannot point this service (and the
   * insecure ws:// URL it builds) at an arbitrary remote endpoint.
   */
  private sanitizeConfig(config: IBConfig): IBConfig {
    const sanitized = { ...config };
    if (!isLocalHostname(sanitized.host)) {
      console.warn(`[IB WebSocket] Rejected non-local host "${sanitized.host}" — using 127.0.0.1`);
      sanitized.host = '127.0.0.1';
    }
    if (!isValidPort(sanitized.port)) {
      console.warn(`[IB WebSocket] Rejected invalid port "${sanitized.port}" — using 7496`);
      sanitized.port = 7496;
    }
    return sanitized;
  }

  /**
   * Connect to IB TWS WebSocket API
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const state = store.getState().ibConnection;

      // Don't reconnect if we've exceeded max attempts
      if (state.reconnectAttempts >= state.maxReconnectAttempts && state.autoReconnect) {
        const error = 'Max reconnection attempts reached. Please check TWS is running.';
        store.dispatch(setError(error));
        reject(new Error(error));
        return;
      }

      store.dispatch(setConnecting());

      try {
        // Note: IB TWS doesn't have a native WebSocket API
        // You'll need to use either:
        // 1. IB Gateway with a WebSocket wrapper (like ib-gateway-docker + custom WS server)
        // 2. A middleware service that translates WebSocket to IB's native API
        // 3. Use the IB API with node-ib package and expose it via WebSocket

        // For now, this is a placeholder that simulates the connection
        // In production, replace with actual IB WebSocket endpoint
        const wsUrl = `ws://${this.config.host}:${this.config.port}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('Connected to IB TWS');
          store.dispatch(setConnected());
          store.dispatch(resetReconnectAttempts());
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          const errorMsg =
            'Failed to connect to IB TWS. Make sure TWS is running and WebSocket API is enabled.';
          store.dispatch(setError(errorMsg));
          reject(new Error(errorMsg));
        };

        this.ws.onclose = () => {
          console.log('Disconnected from IB TWS');
          this.stopHeartbeat();
          store.dispatch(setDisconnected());

          const state = store.getState().ibConnection;
          if (state.autoReconnect && state.reconnectAttempts < state.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown connection error';
        store.dispatch(setError(errorMsg));
        reject(error);
      }
    });
  }

  /**
   * Disconnect from IB TWS
   */
  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    store.dispatch(setDisconnected());
  }

  /**
   * Test connection to IB TWS
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Request market data for a ticker
   */
  public async requestMarketData(request: IBMarketDataRequest): Promise<IBMarketDataResponse> {
    if (!this.isConnected()) {
      throw new Error('Not connected to IB TWS');
    }

    const requestId = this.getNextRequestId();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      const message = {
        type: 'marketData',
        requestId,
        ticker: request.ticker,
        exchange: request.exchange || 'SMART',
        secType: request.secType || 'STK',
        currency: request.currency || 'USD',
      };

      this.send(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Request option chain data
   */
  public async requestOptionChain(request: IBOptionChainRequest): Promise<IBOptionData[]> {
    if (!this.isConnected()) {
      throw new Error('Not connected to IB TWS');
    }

    const requestId = this.getNextRequestId();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      const message = {
        type: 'optionChain',
        requestId,
        ticker: request.ticker,
        expiration: request.expiration,
        strikes: request.strikes,
      };

      this.send(message);

      // Timeout after 60 seconds (option chains can take longer)
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Subscribe to real-time updates for a ticker
   */
  public subscribeMarketData(
    ticker: string,
    callback: (data: IBMarketDataResponse) => void
  ): () => void {
    const key = `marketData_${ticker}`;
    this.messageHandlers.set(key, callback);

    // Send subscription request
    if (this.isConnected()) {
      this.send({
        type: 'subscribe',
        ticker,
      });
    }

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(key);
      if (this.isConnected()) {
        this.send({
          type: 'unsubscribe',
          ticker,
        });
      }
    };
  }

  /**
   * Update connection configuration
   */
  public updateConfig(config: Partial<IBConfig>): void {
    this.config = this.sanitizeConfig({ ...this.config, ...config });
  }

  /**
   * Get current configuration
   */
  public getConfig(): IBConfig {
    return { ...this.config };
  }

  // Private methods

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Drop messages that don't match the expected shape (the server is not
      // trusted input). Warn only once to avoid console storms.
      if (!isValidIBMessage(message)) {
        if (!this.warnedInvalidMessage) {
          this.warnedInvalidMessage = true;
          console.warn(
            '[IB WebSocket] Dropping invalid message (further occurrences will not be logged)'
          );
        }
        return;
      }

      // Handle responses to pending requests
      const requestId = message.requestId;
      if (typeof requestId === 'number' && this.pendingRequests.has(requestId)) {
        const { resolve } = this.pendingRequests.get(requestId)!;
        this.pendingRequests.delete(requestId);
        resolve(message.data);
        return;
      }

      // Handle subscribed data
      if (message.type === 'marketData' && message.ticker) {
        const key = `marketData_${message.ticker}`;
        const handler = this.messageHandlers.get(key);
        if (handler) {
          handler(message.data);
        }
      }

      // Handle other message types as needed
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private scheduleReconnect(): void {
    store.dispatch(incrementReconnectAttempts());
    const state = store.getState().ibConnection;

    // Exponential backoff: 2^attempt * 1000ms (max 30 seconds)
    const delay = Math.min(Math.pow(2, state.reconnectAttempts) * 1000, 30000);

    console.log(
      `Reconnecting in ${delay}ms (attempt ${state.reconnectAttempts}/${state.maxReconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private getNextRequestId(): number {
    return ++this.requestId;
  }
}

// Singleton instance
export const ibWebSocketService = new IBWebSocketService();

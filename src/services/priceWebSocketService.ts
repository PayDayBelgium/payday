import { updateTickerPrice } from '../store/slices/tickersSlice';
import { updateOptionPremium } from '../store/slices/positionsSlice';
import {
  setConnectionStatus,
  addSubscribedTickers,
  removeSubscribedTickers,
  clearSubscribedTickers,
  setOptionsSubscribed,
} from '../store/slices/connectivitySlice';
import type { ConnectionStatus, DataMode } from '../types';

// Re-export types for backwards compatibility
export type { ConnectionStatus, DataMode } from '../types';

// Store reference - will be set by initializeWebSocketService
let storeInstance: any = null;

export const initializeWebSocketService = (store: any) => {
  storeInstance = store;
};

const getStore = () => {
  return storeInstance;
};

// Message types from the .NET backend
export interface TickerPriceMessage {
  type: 'ticker_price';
  symbol: string;
  price: number;
  timestamp: string;
}

export interface OptionPriceMessage {
  type: 'option_price';
  symbol: string;
  strike: number;
  expiration: string;
  optionType: 'call' | 'put';
  premium: number;
  delta: number;
  timestamp: string;
}

// Option identifier for subscribe/unsubscribe
export interface OptionIdentifier {
  symbol: string;
  strike: number;
  expiration: string;
  optionType: 'call' | 'put';
}

export interface SubscribeMessage {
  action: 'subscribe';
  channel: 'tickers' | 'options';
  symbols?: string[];
  options?: OptionIdentifier[];
}

export interface UnsubscribeMessage {
  action: 'unsubscribe';
  channel: 'tickers' | 'options';
  symbols?: string[];
  options?: OptionIdentifier[];
}

export interface ConnectionStatusMessage {
  type: 'connection_status';
  status: 'connected' | 'subscribed' | 'unsubscribed';
  message: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

export type IncomingMessage =
  | TickerPriceMessage
  | OptionPriceMessage
  | ConnectionStatusMessage
  | ErrorMessage;

export interface SetDataModeMessage {
  action: 'set_data_mode';
  mode: DataMode;
}

export type OutgoingMessage = SubscribeMessage | UnsubscribeMessage | SetDataModeMessage;

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  dataMode: DataMode;
}

export interface WebSocketLogEntry {
  id: string;
  timestamp: Date;
  direction: 'incoming' | 'outgoing' | 'system';
  type: string;
  message: string;
  raw?: string;
}

type MessageHandler = (message: IncomingMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;
type LogHandler = (entry: WebSocketLogEntry) => void;

class PriceWebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig = {
    url: 'ws://localhost:5000/ws/prices',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    dataMode: 'demo',
  };
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private status: ConnectionStatus = 'disconnected';
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private logHandlers: Set<LogHandler> = new Set();
  private subscribedTickers: Set<string> = new Set();
  private subscribedOptions: Map<string, OptionIdentifier> = new Map();

  getConfig(): WebSocketConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Save to localStorage
    localStorage.setItem('priceWebSocketConfig', JSON.stringify(this.config));
  }

  loadConfig(): void {
    const saved = localStorage.getItem('priceWebSocketConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
      } catch {
        // Ignore parse errors
      }
    }
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getSubscribedTickers(): string[] {
    return Array.from(this.subscribedTickers);
  }

  getSubscribedOptions(): OptionIdentifier[] {
    return Array.from(this.subscribedOptions.values());
  }

  isOptionsSubscribed(): boolean {
    return this.subscribedOptions.size > 0;
  }

  getDataMode(): DataMode {
    return this.config.dataMode;
  }

  setDataMode(mode: DataMode): void {
    this.config.dataMode = mode;
    // Save to localStorage
    localStorage.setItem('priceWebSocketConfig', JSON.stringify(this.config));

    // If connected, send the mode change to the server
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: SetDataModeMessage = {
        action: 'set_data_mode',
        mode,
      };
      this.send(message);
    }
  }

  private getOptionKey(opt: OptionIdentifier): string {
    return `${opt.symbol.toUpperCase()}_${opt.strike}_${opt.expiration}_${opt.optionType}`;
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  onLog(handler: LogHandler): () => void {
    this.logHandlers.add(handler);
    return () => this.logHandlers.delete(handler);
  }

  private setStatus(newStatus: ConnectionStatus): void {
    this.status = newStatus;
    this.statusHandlers.forEach((handler) => handler(newStatus));
    // Also update Redux store
    try {
      const store = getStore();
      if (store) {
        store.dispatch(setConnectionStatus(newStatus));
      }
    } catch (error) {
      console.error('[WebSocket] Error dispatching status:', error);
    }
  }

  private addLog(
    direction: WebSocketLogEntry['direction'],
    type: string,
    message: string,
    raw?: string
  ): void {
    const entry: WebSocketLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      direction,
      type,
      message,
      raw,
    };
    this.logHandlers.forEach((handler) => handler(entry));
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[WebSocket] connect() called');

      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('[WebSocket] Already connected');
        resolve();
        return;
      }

      this.setStatus('connecting');
      this.addLog('system', 'connect', `Connecting to ${this.config.url}...`);

      try {
        console.log('[WebSocket] Creating new WebSocket to:', this.config.url);
        this.ws = new WebSocket(this.config.url);
        console.log('[WebSocket] WebSocket object created');

        this.ws.onopen = () => {
          console.log('[WebSocket] onopen fired');
          this.reconnectAttempts = 0;
          this.setStatus('connected');
          this.addLog('system', 'connected', 'WebSocket connection established');

          // Send current data mode to server
          const modeMessage: SetDataModeMessage = {
            action: 'set_data_mode',
            mode: this.config.dataMode,
          };
          this.send(modeMessage);

          // Re-subscribe to previously subscribed channels
          if (this.subscribedTickers.size > 0) {
            this.subscribeTickers(Array.from(this.subscribedTickers));
          }
          if (this.subscribedOptions.size > 0) {
            this.subscribeOptions(Array.from(this.subscribedOptions.values()));
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: IncomingMessage = JSON.parse(event.data);
            this.handleMessage(message, event.data);
          } catch {
            this.addLog('incoming', 'parse_error', `Failed to parse message: ${event.data}`);
          }
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocket] onclose fired, code:', event.code, 'reason:', event.reason);
          this.setStatus('disconnected');
          this.addLog(
            'system',
            'disconnected',
            `Connection closed: ${event.reason || 'No reason provided'} (code: ${event.code})`
          );
          this.ws = null;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.log('[WebSocket] onerror fired:', error);
          this.setStatus('error');
          this.addLog('system', 'error', 'WebSocket error occurred');
          reject(error);
        };
      } catch (error) {
        console.error('[WebSocket] Exception creating WebSocket:', error);
        this.setStatus('error');
        this.addLog('system', 'error', `Failed to create WebSocket: ${error}`);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.addLog('system', 'disconnect', 'Disconnecting...');
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.addLog(
        'system',
        'reconnect_failed',
        `Max reconnection attempts (${this.config.maxReconnectAttempts}) reached`
      );
      return;
    }

    this.reconnectAttempts++;
    this.addLog(
      'system',
      'reconnecting',
      `Reconnecting in ${this.config.reconnectInterval / 1000}s (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Error is already logged in connect()
      });
    }, this.config.reconnectInterval);
  }

  private handleMessage(message: IncomingMessage, raw: string): void {
    this.addLog('incoming', message.type, this.formatMessageForLog(message), raw);

    // Dispatch to Redux based on message type
    switch (message.type) {
      case 'ticker_price':
        this.handleTickerPrice(message as TickerPriceMessage);
        break;
      case 'option_price':
        this.handleOptionPrice(message as OptionPriceMessage);
        break;
      case 'connection_status':
        // Only log, status is already handled
        break;
      case 'error':
        // Log has already been added
        break;
    }

    // Notify all message handlers
    this.messageHandlers.forEach((handler) => handler(message));
  }

  private formatMessageForLog(message: IncomingMessage): string {
    switch (message.type) {
      case 'ticker_price': {
        const m = message as TickerPriceMessage;
        return `${m.symbol}: $${m.price.toFixed(2)}`;
      }
      case 'option_price': {
        const m = message as OptionPriceMessage;
        return `${m.symbol} ${m.strike} ${m.optionType.toUpperCase()} ${m.expiration}: $${m.premium.toFixed(2)} (delta: ${m.delta.toFixed(2)})`;
      }
      case 'connection_status': {
        const m = message as ConnectionStatusMessage;
        return m.message;
      }
      case 'error': {
        const m = message as ErrorMessage;
        return m.message;
      }
      default:
        return JSON.stringify(message);
    }
  }

  private handleTickerPrice(message: TickerPriceMessage): void {
    // Update ticker price via Redux
    console.log('[WebSocket] Dispatching updateTickerPrice:', message.symbol, message.price);
    try {
      const store = getStore();
      console.log('[WebSocket] Store instance:', store ? 'found' : 'NOT FOUND');
      store.dispatch(
        updateTickerPrice({
          symbol: message.symbol,
          price: message.price,
        })
      );
      console.log('[WebSocket] Dispatch completed');
    } catch (error) {
      console.error('[WebSocket] Error dispatching ticker price:', error);
    }
  }

  private handleOptionPrice(message: OptionPriceMessage): void {
    // Update option premium and delta via Redux
    getStore().dispatch(
      updateOptionPremium({
        symbol: message.symbol,
        strike: message.strike,
        expiration: message.expiration,
        optionType: message.optionType,
        premium: message.premium,
        delta: message.delta,
      })
    );
  }

  // Legacy method - use subscribeTickers or subscribeOptions instead
  subscribe(channel: 'tickers' | 'options', symbols?: string[]): void {
    if (channel === 'tickers' && symbols) {
      this.subscribeTickers(symbols);
    }
  }

  // Legacy method - use unsubscribeTickers or unsubscribeOptions instead
  unsubscribe(channel: 'tickers' | 'options', symbols?: string[]): void {
    if (channel === 'tickers') {
      this.unsubscribeTickers(symbols);
    } else if (channel === 'options') {
      this.unsubscribeAllOptions();
    }
  }

  subscribeTickers(symbols: string[]): void {
    const message: SubscribeMessage = {
      action: 'subscribe',
      channel: 'tickers',
      symbols,
    };

    this.send(message);
    symbols.forEach((s) => this.subscribedTickers.add(s.toUpperCase()));
    getStore().dispatch(addSubscribedTickers(symbols));
  }

  unsubscribeTickers(symbols?: string[]): void {
    const message: UnsubscribeMessage = {
      action: 'unsubscribe',
      channel: 'tickers',
      symbols,
    };

    this.send(message);

    if (symbols) {
      symbols.forEach((s) => this.subscribedTickers.delete(s.toUpperCase()));
      getStore().dispatch(removeSubscribedTickers(symbols));
    } else {
      this.subscribedTickers.clear();
      getStore().dispatch(clearSubscribedTickers());
    }
  }

  subscribeOptions(options: OptionIdentifier[]): void {
    const message: SubscribeMessage = {
      action: 'subscribe',
      channel: 'options',
      options,
    };

    this.send(message);

    options.forEach((opt) => {
      this.subscribedOptions.set(this.getOptionKey(opt), opt);
    });
    getStore().dispatch(setOptionsSubscribed(this.subscribedOptions.size > 0));
  }

  unsubscribeOptions(options: OptionIdentifier[]): void {
    const message: UnsubscribeMessage = {
      action: 'unsubscribe',
      channel: 'options',
      options,
    };

    this.send(message);

    options.forEach((opt) => {
      this.subscribedOptions.delete(this.getOptionKey(opt));
    });
    getStore().dispatch(setOptionsSubscribed(this.subscribedOptions.size > 0));
  }

  unsubscribeAllOptions(): void {
    const message: UnsubscribeMessage = {
      action: 'unsubscribe',
      channel: 'options',
    };

    this.send(message);
    this.subscribedOptions.clear();
    getStore().dispatch(setOptionsSubscribed(false));
  }

  private send(message: OutgoingMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.addLog('system', 'send_error', 'Cannot send message: WebSocket is not connected');
      return;
    }

    const raw = JSON.stringify(message);
    this.ws.send(raw);

    let logMessage = message.action;
    if ('channel' in message) {
      logMessage += ` ${message.channel}`;
      if (message.symbols) {
        logMessage += `: ${message.symbols.join(', ')}`;
      }
      if (message.options) {
        logMessage += `: ${message.options.length} option(s)`;
      }
    } else if ('mode' in message) {
      logMessage += `: ${message.mode}`;
    }

    this.addLog('outgoing', message.action, logMessage, raw);
  }
}

// Singleton instance
export const priceWebSocketService = new PriceWebSocketService();

// Load config on import
priceWebSocketService.loadConfig();

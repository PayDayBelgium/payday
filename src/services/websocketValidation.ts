// Pure validation helpers for the WebSocket services.
// Extracted from priceWebSocketService / ibWebSocketService so they can be
// unit-tested without a real WebSocket connection.
import type { IncomingMessage, WebSocketConfig } from './priceWebSocketService';
import type { DataMode } from '../types';

/** Hostnames considered "local" — the only ones allowed over insecure ws://. */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** True when the host is a loopback/localhost address. */
export const isLocalHostname = (host: string): boolean =>
  LOCAL_HOSTNAMES.has(host.trim().toLowerCase());

/**
 * Validates a WebSocket endpoint URL (loaded from localStorage or entered by
 * the user): `wss://` is allowed for any host, plain `ws://` only for
 * localhost. Any other scheme (http:, javascript:, ...) or unparseable value
 * is rejected, so a tampered config cannot point the price stream at an
 * arbitrary endpoint over an insecure channel.
 */
export const isAllowedWebSocketUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol === 'wss:') return true;
  if (parsed.protocol === 'ws:') return isLocalHostname(parsed.hostname);
  return false;
};

/** True when the value is a valid TCP port number. */
export const isValidPort = (port: unknown): port is number =>
  typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65535;

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Type guard for messages received on the price WebSocket. Only the fields
 * that are actually consumed downstream (Redux dispatch + log formatting)
 * are validated; anything malformed is dropped before it reaches the store.
 */
export const isValidPriceMessage = (msg: unknown): msg is IncomingMessage => {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  switch (m.type) {
    case 'ticker_price':
      // Dispatched into tickersSlice: symbol + price must be sane.
      return isNonEmptyString(m.symbol) && isFiniteNumber(m.price) && m.price > 0;
    case 'option_price':
      // Dispatched into positionsSlice (updateOptionPremium) and logged.
      return (
        isNonEmptyString(m.symbol) &&
        isFiniteNumber(m.strike) &&
        m.strike > 0 &&
        isNonEmptyString(m.expiration) &&
        (m.optionType === 'call' || m.optionType === 'put') &&
        isFiniteNumber(m.premium) &&
        m.premium >= 0 &&
        isFiniteNumber(m.delta)
      );
    case 'connection_status':
    case 'error':
      // Only logged; the log formatter reads `message` as a string.
      return typeof m.message === 'string';
    default:
      return false;
  }
};

// --- WebSocket config sanitization -----------------------------------------

/** Reconnect interval bounds: at least 1s (no hammering), at most 1h. */
export const MIN_RECONNECT_INTERVAL_MS = 1000;
export const MAX_RECONNECT_INTERVAL_MS = 3_600_000;
/** Reconnect attempts bounds: 0 disables reconnecting, 100 is plenty. */
export const MAX_RECONNECT_ATTEMPTS = 100;

const VALID_DATA_MODES: ReadonlySet<string> = new Set(['demo', 'demo-feed', 'live']);

const isValidDataMode = (v: unknown): v is DataMode =>
  typeof v === 'string' && VALID_DATA_MODES.has(v);

const isValidReconnectInterval = (v: unknown): v is number =>
  isFiniteNumber(v) && v >= MIN_RECONNECT_INTERVAL_MS && v <= MAX_RECONNECT_INTERVAL_MS;

const isValidMaxReconnectAttempts = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_RECONNECT_ATTEMPTS;

export interface WebSocketConfigSanitizeResult {
  /** The sanitized config: valid candidate fields applied over the fallback. */
  config: WebSocketConfig;
  /** Names of candidate fields that were present but invalid (or 'config' for a non-object). */
  rejected: string[];
}

/**
 * Per-field validation of a (partial) WebSocket config from untrusted input —
 * the persisted localStorage blob or the settings form. Fields that are absent
 * keep the fallback silently; fields that are present but invalid keep the
 * fallback AND are reported in `rejected` so callers can warn/toast.
 */
export const sanitizeWebSocketConfig = (
  candidate: unknown,
  fallback: WebSocketConfig
): WebSocketConfigSanitizeResult => {
  const config: WebSocketConfig = { ...fallback };
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { config, rejected: ['config'] };
  }
  const c = candidate as Record<string, unknown>;
  const rejected: string[] = [];

  if (c.url !== undefined) {
    if (isAllowedWebSocketUrl(c.url)) config.url = c.url;
    else rejected.push('url');
  }
  if (c.reconnectInterval !== undefined) {
    if (isValidReconnectInterval(c.reconnectInterval))
      config.reconnectInterval = c.reconnectInterval;
    else rejected.push('reconnectInterval');
  }
  if (c.maxReconnectAttempts !== undefined) {
    if (isValidMaxReconnectAttempts(c.maxReconnectAttempts)) {
      config.maxReconnectAttempts = c.maxReconnectAttempts;
    } else {
      rejected.push('maxReconnectAttempts');
    }
  }
  if (c.dataMode !== undefined) {
    if (isValidDataMode(c.dataMode)) config.dataMode = c.dataMode;
    else rejected.push('dataMode');
  }

  return { config, rejected };
};

/**
 * Type guard for messages received on the IB WebSocket. The handler reads
 * `requestId` (pending-request lookup), `type`/`ticker` (subscription
 * routing) and forwards `data` — so those are the fields that must be sane.
 */
export const isValidIBMessage = (msg: unknown): msg is Record<string, unknown> => {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  if (m.requestId !== undefined && !isFiniteNumber(m.requestId)) return false;
  if (m.type === 'marketData' && m.ticker !== undefined && !isNonEmptyString(m.ticker)) {
    return false;
  }
  return true;
};

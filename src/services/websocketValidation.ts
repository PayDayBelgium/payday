// Pure validation helpers for the WebSocket services.
// Extracted from priceWebSocketService / ibWebSocketService so they can be
// unit-tested without a real WebSocket connection.
import type { IncomingMessage } from './priceWebSocketService';

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

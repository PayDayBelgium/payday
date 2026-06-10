import { describe, it, expect } from 'vitest';
import {
  isAllowedWebSocketUrl,
  isLocalHostname,
  isValidIBMessage,
  isValidPort,
  isValidPriceMessage,
} from './websocketValidation';

describe('isLocalHostname', () => {
  it('accepts loopback hosts', () => {
    expect(isLocalHostname('localhost')).toBe(true);
    expect(isLocalHostname('127.0.0.1')).toBe(true);
    expect(isLocalHostname('[::1]')).toBe(true);
    expect(isLocalHostname('::1')).toBe(true);
    expect(isLocalHostname('LOCALHOST')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isLocalHostname('example.com')).toBe(false);
    expect(isLocalHostname('192.168.1.10')).toBe(false);
    expect(isLocalHostname('localhost.evil.com')).toBe(false);
    expect(isLocalHostname('')).toBe(false);
  });
});

describe('isAllowedWebSocketUrl', () => {
  it('allows ws:// only for localhost', () => {
    expect(isAllowedWebSocketUrl('ws://localhost:5000/ws/prices')).toBe(true);
    expect(isAllowedWebSocketUrl('ws://127.0.0.1:5000/ws')).toBe(true);
    expect(isAllowedWebSocketUrl('ws://[::1]:5000/ws')).toBe(true);
    expect(isAllowedWebSocketUrl('ws://evil.example.com/ws')).toBe(false);
    expect(isAllowedWebSocketUrl('ws://192.168.1.10:5000/ws')).toBe(false);
  });

  it('allows wss:// for any host', () => {
    expect(isAllowedWebSocketUrl('wss://prices.example.com/ws')).toBe(true);
    expect(isAllowedWebSocketUrl('wss://localhost:5000/ws')).toBe(true);
  });

  it('rejects other schemes and garbage', () => {
    expect(isAllowedWebSocketUrl('http://localhost:5000/ws')).toBe(false);
    expect(isAllowedWebSocketUrl('https://example.com')).toBe(false);
    expect(isAllowedWebSocketUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedWebSocketUrl('not a url')).toBe(false);
    expect(isAllowedWebSocketUrl('')).toBe(false);
    expect(isAllowedWebSocketUrl(undefined)).toBe(false);
    expect(isAllowedWebSocketUrl(42)).toBe(false);
  });
});

describe('isValidPort', () => {
  it('accepts integer ports in range', () => {
    expect(isValidPort(1)).toBe(true);
    expect(isValidPort(7496)).toBe(true);
    expect(isValidPort(65535)).toBe(true);
  });

  it('rejects out-of-range and non-integer values', () => {
    expect(isValidPort(0)).toBe(false);
    expect(isValidPort(65536)).toBe(false);
    expect(isValidPort(-1)).toBe(false);
    expect(isValidPort(80.5)).toBe(false);
    expect(isValidPort('7496')).toBe(false);
    expect(isValidPort(NaN)).toBe(false);
  });
});

describe('isValidPriceMessage', () => {
  it('accepts a valid ticker_price message', () => {
    expect(
      isValidPriceMessage({ type: 'ticker_price', symbol: 'AAPL', price: 187.5, timestamp: 't' })
    ).toBe(true);
  });

  it('rejects ticker_price with missing/invalid symbol or price', () => {
    expect(isValidPriceMessage({ type: 'ticker_price', price: 187.5 })).toBe(false);
    expect(isValidPriceMessage({ type: 'ticker_price', symbol: '', price: 187.5 })).toBe(false);
    expect(isValidPriceMessage({ type: 'ticker_price', symbol: 'AAPL' })).toBe(false);
    expect(isValidPriceMessage({ type: 'ticker_price', symbol: 'AAPL', price: 'x' })).toBe(false);
    expect(isValidPriceMessage({ type: 'ticker_price', symbol: 'AAPL', price: -1 })).toBe(false);
    expect(isValidPriceMessage({ type: 'ticker_price', symbol: 'AAPL', price: NaN })).toBe(false);
    expect(isValidPriceMessage({ type: 'ticker_price', symbol: 'AAPL', price: Infinity })).toBe(
      false
    );
  });

  it('accepts a valid option_price message', () => {
    expect(
      isValidPriceMessage({
        type: 'option_price',
        symbol: 'AAPL',
        strike: 190,
        expiration: '2026-07-17',
        optionType: 'call',
        premium: 2.35,
        delta: 0.42,
      })
    ).toBe(true);
  });

  it('rejects option_price with bad fields', () => {
    const base = {
      type: 'option_price',
      symbol: 'AAPL',
      strike: 190,
      expiration: '2026-07-17',
      optionType: 'put',
      premium: 2.35,
      delta: -0.42,
    };
    expect(isValidPriceMessage(base)).toBe(true);
    expect(isValidPriceMessage({ ...base, strike: -5 })).toBe(false);
    expect(isValidPriceMessage({ ...base, optionType: 'straddle' })).toBe(false);
    expect(isValidPriceMessage({ ...base, premium: -1 })).toBe(false);
    expect(isValidPriceMessage({ ...base, delta: 'high' })).toBe(false);
    expect(isValidPriceMessage({ ...base, expiration: 7 })).toBe(false);
  });

  it('validates status/error messages and rejects unknown types', () => {
    expect(
      isValidPriceMessage({ type: 'connection_status', status: 'connected', message: 'ok' })
    ).toBe(true);
    expect(isValidPriceMessage({ type: 'error', message: 'boom' })).toBe(true);
    expect(isValidPriceMessage({ type: 'error' })).toBe(false);
    expect(isValidPriceMessage({ type: 'evil_type', payload: {} })).toBe(false);
    expect(isValidPriceMessage(null)).toBe(false);
    expect(isValidPriceMessage('ticker_price')).toBe(false);
    expect(isValidPriceMessage([])).toBe(false);
  });
});

describe('isValidIBMessage', () => {
  it('accepts plain objects with sane routing fields', () => {
    expect(isValidIBMessage({ type: 'pong' })).toBe(true);
    expect(isValidIBMessage({ requestId: 3, data: { price: 1 } })).toBe(true);
    expect(isValidIBMessage({ type: 'marketData', ticker: 'AAPL', data: {} })).toBe(true);
  });

  it('rejects non-objects and malformed routing fields', () => {
    expect(isValidIBMessage(null)).toBe(false);
    expect(isValidIBMessage('x')).toBe(false);
    expect(isValidIBMessage({ requestId: 'three' })).toBe(false);
    expect(isValidIBMessage({ requestId: NaN })).toBe(false);
    expect(isValidIBMessage({ type: 'marketData', ticker: 7 })).toBe(false);
  });
});

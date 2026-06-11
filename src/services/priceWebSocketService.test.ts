import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { priceWebSocketService } from './priceWebSocketService';

const DEFAULTS = {
  url: 'ws://localhost:5000/ws/prices',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  dataMode: 'demo' as const,
};

beforeEach(() => {
  localStorage.clear();
  // Reset the singleton's config to the defaults between tests.
  priceWebSocketService.updateConfig(DEFAULTS);
  localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('priceWebSocketService.loadConfig', () => {
  it('falls back per-field for invalid persisted values and keeps the valid ones', () => {
    localStorage.setItem(
      'priceWebSocketConfig',
      JSON.stringify({
        url: 'ws://evil.example.com/ws', // unsafe → default
        reconnectInterval: 5, // below 1000ms minimum → default
        maxReconnectAttempts: 50, // valid → kept
        dataMode: 'totally-bogus', // not in the enum → default
      })
    );
    priceWebSocketService.loadConfig();
    const config = priceWebSocketService.getConfig();
    expect(config.url).toBe(DEFAULTS.url);
    expect(config.reconnectInterval).toBe(DEFAULTS.reconnectInterval);
    expect(config.maxReconnectAttempts).toBe(50);
    expect(config.dataMode).toBe(DEFAULTS.dataMode);
  });

  it('accepts a fully valid persisted config', () => {
    localStorage.setItem(
      'priceWebSocketConfig',
      JSON.stringify({
        url: 'wss://prices.example.com/ws',
        reconnectInterval: 2000,
        maxReconnectAttempts: 3,
        dataMode: 'demo-feed',
      })
    );
    priceWebSocketService.loadConfig();
    expect(priceWebSocketService.getConfig()).toEqual({
      url: 'wss://prices.example.com/ws',
      reconnectInterval: 2000,
      maxReconnectAttempts: 3,
      dataMode: 'demo-feed',
    });
  });

  it('survives unparseable persisted JSON', () => {
    localStorage.setItem('priceWebSocketConfig', '{not json');
    priceWebSocketService.loadConfig();
    expect(priceWebSocketService.getConfig()).toEqual(DEFAULTS);
  });
});

describe('priceWebSocketService.updateConfig', () => {
  it('returns false and keeps the old URL when the new one is unsafe', () => {
    const accepted = priceWebSocketService.updateConfig({ url: 'ws://evil.example.com/ws' });
    expect(accepted).toBe(false);
    expect(priceWebSocketService.getConfig().url).toBe(DEFAULTS.url);
  });

  it('returns false and keeps the old value for an invalid reconnectInterval', () => {
    const accepted = priceWebSocketService.updateConfig({ reconnectInterval: 1 });
    expect(accepted).toBe(false);
    expect(priceWebSocketService.getConfig().reconnectInterval).toBe(DEFAULTS.reconnectInterval);
  });

  it('returns true and persists a valid config', () => {
    const accepted = priceWebSocketService.updateConfig({
      url: 'wss://prices.example.com/ws',
      reconnectInterval: 1500,
      maxReconnectAttempts: 7,
    });
    expect(accepted).toBe(true);
    expect(priceWebSocketService.getConfig().url).toBe('wss://prices.example.com/ws');
    const persisted = JSON.parse(localStorage.getItem('priceWebSocketConfig') ?? '{}');
    expect(persisted.url).toBe('wss://prices.example.com/ws');
    expect(persisted.reconnectInterval).toBe(1500);
    expect(persisted.maxReconnectAttempts).toBe(7);
  });

  it('still applies the valid fields when another field is rejected', () => {
    const accepted = priceWebSocketService.updateConfig({
      url: 'http://nope', // rejected
      maxReconnectAttempts: 4, // applied
    });
    expect(accepted).toBe(false);
    const config = priceWebSocketService.getConfig();
    expect(config.url).toBe(DEFAULTS.url);
    expect(config.maxReconnectAttempts).toBe(4);
  });
});

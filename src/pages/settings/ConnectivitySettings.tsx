import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, Play, Square, Save, RotateCcw, Trash2, Send, TrendingUp, Radio } from 'lucide-react';
import { useSelector } from 'react-redux';
import {
  priceWebSocketService,
  type WebSocketLogEntry,
  type ConnectionStatus,
  type OptionIdentifier,
  type DataMode,
} from '../../services/priceWebSocketService';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { selectActivePositions } from '../../store/slices/positionsSlice';
import type { Position } from '../../types';

const DATA_MODE_OPTIONS: { value: DataMode; label: string; description: string }[] = [
  { value: 'demo', label: 'Demo (Manual)', description: 'Prijzen handmatig aanpassen via simulator control' },
  { value: 'demo-feed', label: 'Demo (Feed)', description: 'Gesimuleerde prijzen automatisch gegenereerd' },
  { value: 'live', label: 'Live (IB)', description: 'Real-time data van Interactive Brokers' },
];

export const ConnectivitySettings: React.FC = () => {
  const tickers = useSelector(selectAllTickers);
  const activePositions = useSelector(selectActivePositions);
  const [config, setConfig] = useState(priceWebSocketService.getConfig());
  const [dataMode, setDataMode] = useState<DataMode>(priceWebSocketService.getDataMode());
  const [status, setStatus] = useState<ConnectionStatus>(priceWebSocketService.getStatus());
  const [logs, setLogs] = useState<WebSocketLogEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [subscribeSymbol, setSubscribeSymbol] = useState('');
  const [subscribedTickers, setSubscribedTickers] = useState<string[]>(priceWebSocketService.getSubscribedTickers());
  const [subscribedOptions, setSubscribedOptions] = useState<OptionIdentifier[]>(priceWebSocketService.getSubscribedOptions());
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Get option positions from active positions
  const optionPositions = activePositions.filter(
    (p): p is Position & { type: 'call' | 'put'; strike: number; expiration: string } =>
      (p.type === 'call' || p.type === 'put') && 'strike' in p && 'expiration' in p
  );

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribeStatus = priceWebSocketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Subscribe to log entries
    const unsubscribeLog = priceWebSocketService.onLog((entry) => {
      setLogs((prev) => [...prev.slice(-499), entry]); // Keep last 500 logs
    });

    return () => {
      unsubscribeStatus();
      unsubscribeLog();
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleConnect = async () => {
    try {
      await priceWebSocketService.connect();
    } catch (error) {
      // Error is logged by the service
    }
  };

  const handleDisconnect = () => {
    priceWebSocketService.disconnect();
  };

  const handleSaveConfig = () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      priceWebSocketService.updateConfig(config);
      setSaveMessage({ type: 'success', text: 'Configuration saved!' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetConfig = () => {
    const defaultConfig = {
      url: 'ws://localhost:5000/ws/prices',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      dataMode: 'demo' as DataMode,
    };
    setConfig(defaultConfig);
    setDataMode('demo');
    setSaveMessage(null);
  };

  const handleDataModeChange = (mode: DataMode) => {
    setDataMode(mode);
    priceWebSocketService.setDataMode(mode);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleSubscribeTicker = () => {
    if (!subscribeSymbol.trim()) return;

    const symbols = subscribeSymbol
      .toUpperCase()
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (symbols.length > 0) {
      priceWebSocketService.subscribe('tickers', symbols);
      setSubscribedTickers(priceWebSocketService.getSubscribedTickers());
      setSubscribeSymbol('');
    }
  };

  const handleUnsubscribeTicker = (symbol: string) => {
    priceWebSocketService.unsubscribe('tickers', [symbol]);
    setSubscribedTickers(priceWebSocketService.getSubscribedTickers());
  };

  const handleSubscribeAllOptions = () => {
    if (optionPositions.length === 0) return;

    const options: OptionIdentifier[] = optionPositions.map((pos) => ({
      symbol: pos.ticker,
      strike: pos.strike,
      expiration: pos.expiration,
      optionType: pos.type as 'call' | 'put',
    }));

    priceWebSocketService.subscribeOptions(options);
    setSubscribedOptions(priceWebSocketService.getSubscribedOptions());
  };

  const handleUnsubscribeAllOptions = () => {
    priceWebSocketService.unsubscribeAllOptions();
    setSubscribedOptions([]);
  };

  const handleUnsubscribeOption = (option: OptionIdentifier) => {
    priceWebSocketService.unsubscribeOptions([option]);
    setSubscribedOptions(priceWebSocketService.getSubscribedOptions());
  };

  const handleSubscribeAllTickers = () => {
    const symbols = tickers.map(t => t.symbol);
    if (symbols.length > 0) {
      priceWebSocketService.subscribe('tickers', symbols);
      setSubscribedTickers(priceWebSocketService.getSubscribedTickers());
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBgColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLogEntryColor = (entry: WebSocketLogEntry) => {
    switch (entry.direction) {
      case 'incoming':
        return 'text-green-400';
      case 'outgoing':
        return 'text-blue-400';
      case 'system':
        return entry.type === 'error' ? 'text-red-400' : 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Config & Subscriptions */}
        <div className="space-y-6">
          {/* Connection Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Connection Status
            </h2>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusBgColor()} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
                <span className={`font-medium capitalize ${getStatusColor()}`}>
                  {status}
                </span>
              </div>
              <div className="flex gap-2">
                {status === 'disconnected' || status === 'error' ? (
                  <button
                    onClick={handleConnect}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Connect
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Data Mode Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Data Mode
              </h2>
            </div>

            <div className="space-y-2">
              {DATA_MODE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    dataMode === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="dataMode"
                    value={option.value}
                    checked={dataMode === option.value}
                    onChange={() => handleDataModeChange(option.value)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className={`font-medium ${
                      dataMode === option.value
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {option.label}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {dataMode === 'live' && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Let op:</strong> Live mode vereist een actieve Interactive Brokers connectie via de backend service.
                </p>
              </div>
            )}
          </div>

          {/* Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              WebSocket Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  WebSocket URL
                </label>
                <input
                  type="text"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  placeholder="ws://localhost:5000/ws/prices"
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reconnect Interval (ms)
                  </label>
                  <input
                    type="number"
                    value={config.reconnectInterval}
                    onChange={(e) => setConfig({ ...config, reconnectInterval: Number(e.target.value) })}
                    min="1000"
                    step="1000"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Reconnect Attempts
                  </label>
                  <input
                    type="number"
                    value={config.maxReconnectAttempts}
                    onChange={(e) => setConfig({ ...config, maxReconnectAttempts: Number(e.target.value) })}
                    min="1"
                    max="100"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>

                <button
                  onClick={handleResetConfig}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>

              {saveMessage && (
                <div
                  className={`p-2 rounded-lg text-sm ${
                    saveMessage.type === 'success'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}
            </div>
          </div>

          {/* Subscriptions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Subscriptions
            </h2>

            {/* Ticker Subscription */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={subscribeSymbol}
                  onChange={(e) => setSubscribeSymbol(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubscribeTicker()}
                  placeholder="AAPL, MSFT, GOOGL..."
                  className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                  disabled={status !== 'connected'}
                />
                <button
                  onClick={handleSubscribeTicker}
                  disabled={status !== 'connected' || !subscribeSymbol.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleSubscribeAllTickers}
                disabled={status !== 'connected' || tickers.length === 0}
                className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Subscribe All Tickers ({tickers.length})
              </button>

              {/* Subscribed Tickers */}
              {subscribedTickers.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Subscribed tickers:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {subscribedTickers.map((symbol) => (
                      <span
                        key={symbol}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                      >
                        {symbol}
                        <button
                          onClick={() => handleUnsubscribeTicker(symbol)}
                          className="hover:text-red-500"
                          disabled={status !== 'connected'}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Options Subscription */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Options Prices
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {optionPositions.length} position(s)
                  </span>
                </div>

                <button
                  onClick={handleSubscribeAllOptions}
                  disabled={status !== 'connected' || optionPositions.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors mb-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Subscribe All Options ({optionPositions.length})
                </button>

                {/* Subscribed Options */}
                {subscribedOptions.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Subscribed options:
                      </p>
                      <button
                        onClick={handleUnsubscribeAllOptions}
                        disabled={status !== 'connected'}
                        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                      >
                        Unsubscribe all
                      </button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {subscribedOptions.map((opt) => {
                        const key = `${opt.symbol}_${opt.strike}_${opt.expiration}_${opt.optionType}`;
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs"
                          >
                            <span>
                              {opt.symbol} {opt.strike} {opt.optionType.toUpperCase()} {opt.expiration}
                            </span>
                            <button
                              onClick={() => handleUnsubscribeOption(opt)}
                              className="hover:text-red-500 ml-2"
                              disabled={status !== 'connected'}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show available options if not all subscribed */}
                {optionPositions.length > 0 && subscribedOptions.length === 0 && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-600 dark:text-gray-400">
                    <p className="font-medium mb-1">Available options to subscribe:</p>
                    <ul className="space-y-0.5">
                      {optionPositions.slice(0, 5).map((pos) => (
                        <li key={pos.id}>
                          {pos.ticker} {pos.strike} {pos.type.toUpperCase()} {pos.expiration}
                        </li>
                      ))}
                      {optionPositions.length > 5 && (
                        <li className="text-gray-500">+{optionPositions.length - 5} more...</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Log Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Message Log
              </h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Auto-scroll
                </label>
                <button
                  onClick={handleClearLogs}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>

            <div
              ref={logContainerRef}
              className="flex-1 overflow-auto p-4 bg-gray-900 font-mono text-xs min-h-[500px] max-h-[600px]"
            >
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  {status === 'disconnected' ? (
                    <>
                      <WifiOff className="w-12 h-12 mb-3 opacity-50" />
                      <p>Not connected</p>
                      <p className="text-xs mt-1">Click "Connect" to start receiving messages</p>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-12 h-12 mb-3 opacity-50" />
                      <p>Waiting for messages...</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((entry) => (
                    <div key={entry.id} className="flex gap-2">
                      <span className="text-gray-500 whitespace-nowrap">
                        [{formatTimestamp(entry.timestamp)}]
                      </span>
                      <span className={`whitespace-nowrap ${getLogEntryColor(entry)}`}>
                        {entry.direction === 'incoming' && '<<'}
                        {entry.direction === 'outgoing' && '>>'}
                        {entry.direction === 'system' && '--'}
                      </span>
                      <span className="text-gray-400">
                        [{entry.type}]
                      </span>
                      <span className={getLogEntryColor(entry)}>
                        {entry.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs">
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <span className="text-green-400">&lt;&lt;</span> Incoming
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-blue-400">&gt;&gt;</span> Outgoing
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">--</span> System
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

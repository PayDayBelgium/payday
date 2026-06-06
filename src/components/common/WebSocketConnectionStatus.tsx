import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { priceWebSocketService } from '../../services/priceWebSocketService';
import type { ConnectionStatus } from '../../services/priceWebSocketService';
import {
  selectConnectionStatus,
  selectLastConnected,
  selectLastError,
  selectSubscribedTickers,
} from '../../store/slices/connectivitySlice';

interface WebSocketConnectionStatusProps {
  showLabel?: boolean;
  compact?: boolean;
}

export const WebSocketConnectionStatus: React.FC<WebSocketConnectionStatusProps> = ({
  showLabel = true,
  compact = false,
}) => {
  const status = useAppSelector(selectConnectionStatus);
  const lastConnected = useAppSelector(selectLastConnected);
  const lastError = useAppSelector(selectLastError);
  const subscribedTickers = useAppSelector(selectSubscribedTickers);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await priceWebSocketService.connect();
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDisconnect = () => {
    priceWebSocketService.disconnect();
  };

  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-positive-600 dark:text-positive-500',
          bgColor: 'bg-positive-50 dark:bg-positive-700/25',
          label: 'Connected',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-primary-700 dark:text-primary-300',
          bgColor: 'bg-primary-50 dark:bg-primary-900/30',
          label: 'Connecting...',
          pulse: true,
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-negative-600 dark:text-negative-500',
          bgColor: 'bg-negative-50 dark:bg-negative-700/25',
          label: 'Error',
          pulse: false,
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-ink-600 dark:text-ink-400',
          bgColor: 'bg-surface-subtle dark:bg-trading-dark-900/30',
          label: 'Disconnected',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  // Toggle connect/disconnect on click
  const handleToggle = () => {
    if (status === 'connected') {
      handleDisconnect();
    } else if (status === 'disconnected' || status === 'error') {
      handleRetry();
    }
  };

  if (compact) {
    return (
      <div className="relative group">
        <button
          onClick={handleToggle}
          className={`p-2 rounded-lg transition-all ${config.bgColor} ${
            status === 'disconnected' || status === 'error'
              ? 'cursor-pointer hover:scale-110 hover:shadow-md ring-2 ring-yellow-500 ring-offset-2'
              : status === 'connected'
                ? 'cursor-pointer hover:bg-positive-50 dark:hover:bg-positive-700/50'
                : ''
          }`}
          disabled={isRetrying || status === 'connecting'}
          title={
            status === 'connected'
              ? 'Click to disconnect'
              : status === 'disconnected' || status === 'error'
                ? 'Click to connect'
                : config.label
          }
        >
          <Icon
            className={`w-5 h-5 ${config.color} ${config.pulse || isRetrying ? 'animate-spin' : ''}`}
          />
        </button>

        {/* Tooltip with invisible bridge to prevent gap */}
        <div className="absolute right-0 top-full hidden group-hover:block w-64 pt-1 z-50">
          <div className="bg-surface dark:bg-surface text-ink-900 text-xs rounded-lg shadow-lg border-2 border-primary-900 overflow-hidden p-3">
            <p className="font-bold mb-1 text-ink-900">Price WebSocket</p>
            <p
              className={`${
                status === 'connected'
                  ? 'text-positive-600'
                  : status === 'connecting'
                    ? 'text-primary-700'
                    : status === 'error'
                      ? 'text-negative-600'
                      : 'text-ink-600'
              } font-semibold`}
            >
              {config.label}
            </p>
            {lastError && (
              <div className="mt-2 p-2 bg-negative-50 rounded border border-negative-500/30">
                <p className="text-negative-700 text-xs">{lastError}</p>
              </div>
            )}
            {lastConnected && status === 'connected' && (
              <p className="text-ink-600 mt-2">
                Connected: {new Date(lastConnected).toLocaleTimeString()}
              </p>
            )}
            {subscribedTickers.length > 0 && status === 'connected' && (
              <div className="mt-2">
                <p className="text-ink-600 text-xs">
                  Subscribed: {subscribedTickers.slice(0, 5).join(', ')}
                  {subscribedTickers.length > 5 && ` +${subscribedTickers.length - 5} more`}
                </p>
              </div>
            )}
            <p className="text-ink-400 text-xs mt-2 italic">
              {status === 'connected' ? 'Click to disconnect' : 'Click to connect'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor}`}>
      <Icon
        className={`w-5 h-5 ${config.color} ${config.pulse || isRetrying ? 'animate-spin' : ''}`}
      />

      {showLabel && (
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
          {lastError && (
            <p className="text-xs text-negative-600 dark:text-negative-500 mt-0.5">{lastError}</p>
          )}
          {lastConnected && status === 'connected' && (
            <p className="text-xs text-ink-600 dark:text-ink-400 mt-0.5">
              Last: {new Date(lastConnected).toLocaleTimeString()}
            </p>
          )}
          {subscribedTickers.length > 0 && status === 'connected' && (
            <p className="text-xs text-ink-600 dark:text-ink-400 mt-0.5">
              {subscribedTickers.length} ticker(s) subscribed
            </p>
          )}
        </div>
      )}

      {status === 'connected' ? (
        <button
          onClick={handleDisconnect}
          className="px-3 py-1.5 text-xs font-medium text-white bg-negative-600 hover:bg-negative-700 rounded-md transition-colors"
        >
          Disconnect
        </button>
      ) : (
        (status === 'disconnected' || status === 'error') && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-3 py-1.5 text-xs font-medium text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 rounded-md transition-colors"
          >
            {isRetrying ? 'Connecting...' : 'Connect'}
          </button>
        )
      )}
    </div>
  );
};

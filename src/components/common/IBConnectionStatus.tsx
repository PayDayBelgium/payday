import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, Settings } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { ibWebSocketService } from '../../services/ibWebSocketService';
import type { ConnectionStatus } from '../../store/slices/ibConnectionSlice';

interface IBConnectionStatusProps {
  showLabel?: boolean;
  compact?: boolean;
}

export const IBConnectionStatus: React.FC<IBConnectionStatusProps> = ({
  showLabel = true,
  compact = false,
}) => {
  const { status, error, lastConnected, reconnectAttempts, maxReconnectAttempts } = useAppSelector(
    (state) => state.ibConnection
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await ibWebSocketService.connect();
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          label: 'Connected',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'Connecting...',
          pulse: true,
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          label: 'Error',
          pulse: false,
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          label: 'Disconnected',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="relative group">
        <button
          onClick={() => status === 'disconnected' || status === 'error' ? handleRetry() : undefined}
          className={`p-2 rounded-lg transition-all ${config.bgColor} ${
            status === 'disconnected' || status === 'error'
              ? 'cursor-pointer hover:scale-110 hover:shadow-md ring-2 ring-yellow-500 ring-offset-2'
              : status === 'connected'
              ? 'cursor-default'
              : ''
          }`}
          disabled={isRetrying || status === 'connecting'}
          title={status === 'disconnected' || status === 'error' ? 'Click to retry connection' : config.label}
        >
          <Icon
            className={`w-5 h-5 ${config.color} ${config.pulse || isRetrying ? 'animate-spin' : ''}`}
          />
        </button>

        {/* Tooltip */}
        <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-72 bg-gray-50 dark:bg-gray-50 text-gray-900 text-xs rounded-lg shadow-lg border-2 border-blue-900 z-50 overflow-hidden">
          <div className="p-3">
            <p className="font-bold mb-1 text-gray-900">IB TWS Connection</p>
            <p className={`${
              status === 'connected' ? 'text-green-600' :
              status === 'connecting' ? 'text-blue-600' :
              status === 'error' ? 'text-red-600' :
              'text-gray-600'
            } font-semibold`}>
              {config.label}
            </p>
            {error && (
              <div className="mt-2 p-2 bg-red-100 rounded border border-red-300">
                <p className="text-red-700 text-xs">{error}</p>
              </div>
            )}
            {lastConnected && status === 'connected' && (
              <p className="text-gray-600 mt-2">
                ✓ Connected: {new Date(lastConnected).toLocaleTimeString()}
              </p>
            )}
            {status === 'connecting' && reconnectAttempts > 0 && (
              <p className="text-gray-600 mt-2">
                🔄 Retry {reconnectAttempts}/{maxReconnectAttempts}
              </p>
            )}
          </div>

          {(status === 'disconnected' || status === 'error') && (
            <div className="border-t border-gray-300 p-2 bg-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetry();
                }}
                disabled={isRetrying}
                className="w-full px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Connecting...' : 'Retry Connection'}
              </button>
            </div>
          )}
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
          {error && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>}
          {lastConnected && status === 'connected' && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Last: {new Date(lastConnected).toLocaleTimeString()}
            </p>
          )}
          {status === 'connecting' && reconnectAttempts > 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Attempt {reconnectAttempts}/{maxReconnectAttempts}
            </p>
          )}
        </div>
      )}

      {(status === 'disconnected' || status === 'error') && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
        >
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      )}
    </div>
  );
};

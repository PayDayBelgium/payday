import { useEffect, useCallback } from 'react';
import { ibWebSocketService } from '../services/ibWebSocketService';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import {
  setConnecting,
  setConnected,
  setDisconnected,
  setError,
} from '../store/slices/ibConnectionSlice';

/**
 * Hook to manage IB WebSocket connection lifecycle
 * Automatically connects on mount and disconnects on unmount
 * Uses Redux for reactive connection status
 */
export const useIBConnection = (autoConnect: boolean = true) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.ibConnection.status);
  const error = useAppSelector((state) => state.ibConnection.error);
  const lastConnected = useAppSelector((state) => state.ibConnection.lastConnected);

  const connect = useCallback(async () => {
    dispatch(setConnecting());
    try {
      await ibWebSocketService.connect();
      dispatch(setConnected());
    } catch (err) {
      dispatch(setError((err as Error).message));
      throw err;
    }
  }, [dispatch]);

  const disconnect = useCallback(() => {
    ibWebSocketService.disconnect();
    dispatch(setDisconnected());
  }, [dispatch]);

  const testConnection = useCallback(async () => {
    return ibWebSocketService.testConnection();
  }, []);

  useEffect(() => {
    if (autoConnect) {
      // Attempt to connect on mount
      connect().catch((err) => {
        console.warn('Failed to connect to IB TWS on app start:', err);
        // Don't throw - connection status will be reflected in UI
      });
    }

    // Cleanup on unmount
    return () => {
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connect,
    disconnect,
    testConnection,
    // Reactive values from Redux
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    hasError: status === 'error',
    error,
    lastConnected,
  };
};

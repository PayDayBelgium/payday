import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { IBConnectionStatus } from '../../components/common/IBConnectionStatus';
import { ibWebSocketService } from '../../services/ibWebSocketService';
import { usePageTitle } from '../../contexts/PageTitleContext';
import type { IBConfig } from '../../services/ibWebSocketService';

export const IBSettings: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const currentConfig = ibWebSocketService.getConfig();
  const [config, setConfig] = useState<IBConfig>(currentConfig);

  useEffect(() => {
    setPageTitle('Interactive Portfolios Settings', 'Configure connection to TWS or IB Gateway');
  }, [setPageTitle]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Disconnect first
      ibWebSocketService.disconnect();

      // Update config
      ibWebSocketService.updateConfig(config);

      // Try to reconnect with new settings
      await ibWebSocketService.connect();

      setSaveMessage({ type: 'success', text: 'Settings saved and connection established!' });
    } catch {
      setSaveMessage({
        type: 'error',
        text: 'Settings saved but connection failed. Check if TWS is running.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      host: '127.0.0.1',
      port: 7496,
      clientId: 9,
    });
    setSaveMessage(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connection Status */}
          <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white mb-4">
              Connection Status
            </h2>
            <IBConnectionStatus showLabel={true} compact={false} />
          </div>

          {/* Configuration */}
          <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white mb-4">
              Connection Settings
            </h2>

            <div className="space-y-4">
              {/* Host */}
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                  Host
                </label>
                <input
                  type="text"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  placeholder="localhost"
                  className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2"
                />
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Usually 'localhost' or '127.0.0.1'
                </p>
              </div>

              {/* Port */}
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                  Port
                </label>
                <input
                  type="number"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
                  placeholder="7497"
                  className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2"
                />
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Default: 7497 (Paper Trading), 7496 (Live Trading), 4002 (IB Gateway)
                </p>
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                  Client ID
                </label>
                <input
                  type="number"
                  value={config.clientId}
                  onChange={(e) => setConfig({ ...config, clientId: Number(e.target.value) })}
                  placeholder="1"
                  min="0"
                  max="32"
                  className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2"
                />
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Unique ID for this connection (0-32)
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save & Reconnect'}
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-surface-muted dark:bg-trading-dark-700 hover:bg-ink-200 dark:hover:bg-trading-dark-600 text-ink-700 dark:text-ink-200 rounded-lg font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div
                className={`mt-4 p-3 rounded-lg ${
                  saveMessage.type === 'success'
                    ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500'
                    : 'bg-negative-50 dark:bg-negative-700/25 text-negative-700 dark:text-negative-500'
                }`}
              >
                {saveMessage.text}
              </div>
            )}
          </div>
        </div>

        {/* Help Sidebar */}
        <div className="space-y-6">
          {/* Setup Instructions */}
          <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
            <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-4">
              Setup Instructions
            </h3>
            <div className="space-y-3 text-sm text-ink-600 dark:text-ink-400">
              <div>
                <p className="font-semibold text-ink-900 dark:text-white mb-1">
                  1. Enable API in TWS
                </p>
                <p>File → Global Configuration → API → Settings</p>
                <p>Check "Enable ActiveX and Socket Clients"</p>
              </div>

              <div>
                <p className="font-semibold text-ink-900 dark:text-white mb-1">2. Configure Port</p>
                <p>Set Socket Port to 7497 (paper) or 7496 (live)</p>
              </div>

              <div>
                <p className="font-semibold text-ink-900 dark:text-white mb-1">
                  3. Allow Connections
                </p>
                <p>Add 127.0.0.1 to "Trusted IP Addresses"</p>
              </div>

              <div>
                <p className="font-semibold text-ink-900 dark:text-white mb-1">
                  4. WebSocket Setup
                </p>
                <p className="text-caution-600 dark:text-caution-500">
                  Note: IB doesn't natively support WebSocket. You'll need a middleware service.
                </p>
              </div>
            </div>
          </div>

          {/* Connection Ports Reference */}
          <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
            <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-4">
              Port Reference
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-600 dark:text-ink-400">TWS Paper:</span>
                <span className="font-mono font-semibold text-ink-900 dark:text-white">7497</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-600 dark:text-ink-400">TWS Live:</span>
                <span className="font-mono font-semibold text-ink-900 dark:text-white">7496</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-600 dark:text-ink-400">Gateway Paper:</span>
                <span className="font-mono font-semibold text-ink-900 dark:text-white">4002</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-600 dark:text-ink-400">Gateway Live:</span>
                <span className="font-mono font-semibold text-ink-900 dark:text-white">4001</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

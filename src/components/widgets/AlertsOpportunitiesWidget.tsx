import React, { useState, memo } from 'react';
import { AlertCircle, Target, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';
import { ConfirmModal } from '../modals/ConfirmModal';
import { useAlerts, DISMISSED_ALERTS_STORAGE_KEY } from '../../hooks/useAlerts';

interface AlertsOpportunitiesWidgetProps {
  type?: 'alerts' | 'opportunities' | 'both';
}

export const AlertsOpportunitiesWidget: React.FC<AlertsOpportunitiesWidgetProps> = memo(({ type = 'both' }) => {
  const navigate = useNavigate();
  const { pushNavigation } = useNavigation();

  // Use central alerts hook
  const { alerts: evaluatedAlerts, opportunities: evaluatedOpportunities, dismissAlert } = useAlerts();

  // Confirm dismiss state
  const [confirmDismiss, setConfirmDismiss] = useState<{ isOpen: boolean; alertId: string | null; message: string }>({
    isOpen: false,
    alertId: null,
    message: '',
  });

  const handleItemClick = (portfolio: string, ticker: string, alertId: string) => {
    // Navigate based on alert type
    if (alertId.startsWith('negative-cash-')) {
      pushNavigation(`/portfolio/${portfolio}`, portfolio);
      navigate(`/portfolio/${portfolio}`);
    } else if (alertId.startsWith('expiring-')) {
      pushNavigation(`/portfolio/${portfolio}`, portfolio);
      navigate(`/portfolio/${portfolio}`);
    } else {
      pushNavigation(`/portfolio/${portfolio}/stocks-etfs`, `${portfolio} - Aandelen & ETFs`);
      navigate(`/portfolio/${portfolio}/stocks-etfs`);
    }
  };

  const handleDismissAlert = (e: React.MouseEvent, alertId: string, message: string) => {
    e.stopPropagation();
    setConfirmDismiss({ isOpen: true, alertId, message });
  };

  const confirmDismissAlert = () => {
    if (confirmDismiss.alertId) {
      dismissAlert(confirmDismiss.alertId);
    }
    setConfirmDismiss({ isOpen: false, alertId: null, message: '' });
  };

  const renderBox = (type: 'alerts' | 'opportunities') => {
    const items = type === 'alerts' ? evaluatedAlerts : evaluatedOpportunities;
    const iconColor = type === 'alerts'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-green-600 dark:text-green-400';
    const bgColor = type === 'alerts'
      ? 'bg-amber-100 dark:bg-amber-900/30'
      : 'bg-green-100 dark:bg-green-900/30';
    const borderColor = type === 'alerts'
      ? 'border-amber-200 dark:border-amber-500/30'
      : 'border-green-200 dark:border-green-500/30';
    const title = type === 'alerts' ? 'Alerts' : 'Opportunities';
    const Icon = type === 'alerts' ? AlertCircle : Target;

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${borderColor} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${iconColor}`} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          {items.length > 0 && (
            <span className={`px-2 py-1 ${bgColor} rounded-full text-sm font-semibold ${iconColor}`}>
              {items.length}
            </span>
          )}
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <div className={`inline-flex p-3 rounded-full mb-3 ${bgColor}`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {type === 'alerts' ? 'Geen actieve alerts' : 'Geen actieve opportunities'}
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="relative"
              >
                <button
                  onClick={() => handleItemClick(item.portfolio, item.ticker, item.id)}
                  className="w-full text-left p-3 pr-10 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1 rounded ${bgColor}`}>
                          <Icon className={`w-3 h-3 ${iconColor}`} />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {item.ticker} • {item.portfolio}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">
                        {item.message}
                      </p>
                    </div>
                  </div>
                </button>
                {/* Close button */}
                <button
                  onClick={(e) => handleDismissAlert(e, item.id, item.message)}
                  className="absolute top-2 right-2 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Sluiten"
                >
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {type === 'both' && (
        <>
          {renderBox('alerts')}
          {renderBox('opportunities')}
        </>
      )}
      {type === 'alerts' && renderBox('alerts')}
      {type === 'opportunities' && renderBox('opportunities')}

      {/* Confirm Dismiss Modal */}
      {confirmDismiss.isOpen && (
        <ConfirmModal
          isOpen={confirmDismiss.isOpen}
          onClose={() => setConfirmDismiss({ isOpen: false, alertId: null, message: '' })}
          onConfirm={confirmDismissAlert}
          title="Alert Verwijderen"
          message={`Weet je zeker dat je deze alert wilt sluiten?\n\n"${confirmDismiss.message}"\n\nDeze komt niet meer terug.`}
          confirmText="Verwijderen"
          cancelText="Annuleren"
          variant="danger"
        />
      )}
    </>
  );
});

AlertsOpportunitiesWidget.displayName = 'AlertsOpportunitiesWidget';

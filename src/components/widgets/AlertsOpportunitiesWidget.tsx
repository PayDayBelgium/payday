import React, { useState, memo } from 'react';
import { AlertCircle, Target, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../contexts/NavigationContext';
import { ConfirmModal } from '../modals/ConfirmModal';
import { useAlerts } from '../../hooks/useAlerts';
import { parseCoveredCallOpportunity } from '../../utils/opportunityActions';

interface AlertsOpportunitiesWidgetProps {
  type?: 'alerts' | 'opportunities' | 'both';
}

export const AlertsOpportunitiesWidget: React.FC<AlertsOpportunitiesWidgetProps> = memo(
  ({ type = 'both' }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { pushNavigation } = useNavigation();

    // Use central alerts hook
    const {
      alerts: evaluatedAlerts,
      opportunities: evaluatedOpportunities,
      dismissAlert,
    } = useAlerts();

    // Confirm dismiss state
    const [confirmDismiss, setConfirmDismiss] = useState<{
      isOpen: boolean;
      alertId: string | null;
      message: string;
    }>({
      isOpen: false,
      alertId: null,
      message: '',
    });

    const handleItemClick = (portfolio: string, ticker: string, alertId: string) => {
      // CC opportunities: navigate to the portfolio and pass wizard-open state so
      // PortfolioDetail opens the covered-call wizard immediately on arrival.
      const ccTarget = parseCoveredCallOpportunity({ id: alertId, ticker, portfolio });
      if (ccTarget) {
        pushNavigation(`/portfolio/${encodeURIComponent(portfolio)}`, portfolio);
        navigate(`/portfolio/${encodeURIComponent(portfolio)}`, {
          state: { openCoveredCallWizard: { ticker: ccTarget.ticker, underlyingId: ccTarget.underlyingId } },
        });
        return;
      }

      // Navigate based on alert type
      if (alertId.startsWith('negative-cash-')) {
        pushNavigation(`/portfolio/${portfolio}`, portfolio);
        navigate(`/portfolio/${portfolio}`);
      } else if (alertId.startsWith('expiring-')) {
        pushNavigation(`/portfolio/${portfolio}`, portfolio);
        navigate(`/portfolio/${portfolio}`);
      } else {
        pushNavigation(
          `/portfolio/${portfolio}/stocks-etfs`,
          t('widgetsB.stocksEtfsSuffix', { portfolio })
        );
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
      const iconColor =
        type === 'alerts'
          ? 'text-caution-600 dark:text-caution-500'
          : 'text-positive-600 dark:text-positive-500';
      const bgColor =
        type === 'alerts'
          ? 'bg-caution-50 dark:bg-caution-600/25'
          : 'bg-positive-50 dark:bg-positive-700/25';
      const borderColor =
        type === 'alerts'
          ? 'border-caution-500/30 dark:border-caution-500/30'
          : 'border-positive-500/20 dark:border-positive-700/30';
      const title = type === 'alerts' ? 'Alerts' : 'Opportunities';
      const Icon = type === 'alerts' ? AlertCircle : Target;

      return (
        <div
          className={`bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border ${borderColor} p-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${iconColor}`} />
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
            </div>
            {items.length > 0 && (
              <span
                className={`px-2 py-1 ${bgColor} rounded-full text-sm font-semibold ${iconColor}`}
              >
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
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {type === 'alerts'
                    ? t('widgetsB.noActiveAlerts')
                    : t('widgetsB.noActiveOpportunities')}
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="relative">
                  <button
                    onClick={() => handleItemClick(item.portfolio, item.ticker, item.id)}
                    className="w-full text-left p-3 pr-10 bg-surface dark:bg-trading-dark-700/50 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-lg transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-1 rounded ${bgColor}`}>
                            <Icon className={`w-3 h-3 ${iconColor}`} />
                          </div>
                          <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
                            {item.ticker} • {item.portfolio}
                          </p>
                        </div>
                        <p className="text-xs text-ink-600 dark:text-ink-400 ml-6">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  </button>
                  {/* Close button */}
                  <button
                    onClick={(e) => handleDismissAlert(e, item.id, item.message)}
                    className="absolute top-2 right-2 p-1.5 hover:bg-surface-muted dark:hover:bg-trading-dark-600 rounded transition-colors"
                    title={t('widgetsB.close')}
                  >
                    <X className="w-3.5 h-3.5 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300" />
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
            title={t('widgetsB.deleteAlertTitle')}
            message={t('widgetsB.deleteAlertMessage', { message: confirmDismiss.message })}
            confirmText={t('widgetsB.delete')}
            cancelText={t('widgetsB.cancel')}
            variant="danger"
          />
        )}
      </>
    );
  }
);

AlertsOpportunitiesWidget.displayName = 'AlertsOpportunitiesWidget';

import React from 'react';
import {
  AlertCircle,
  Target,
  Clock,
  ShieldAlert,
  TrendingUp,
  DollarSign,
  Percent,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

interface AlertTooltipItem {
  ticker: string;
  message: string;
}

interface AlertTooltipContentProps {
  items: AlertTooltipItem[];
  type: 'alert' | 'opportunity';
}

// Determine the appropriate icon based on message content
const getIconForMessage = (message: string, isAlert: boolean): LucideIcon => {
  if (!isAlert) {
    // Opportunities
    if (message.toLowerCase().includes('premium') || message.toLowerCase().includes('roi')) {
      return DollarSign;
    }
    if (message.toLowerCase().includes('delta')) {
      return Percent;
    }
    return Target;
  }

  // Alerts
  if (message.toLowerCase().includes('verloopt') || message.toLowerCase().includes('expir')) {
    return Clock;
  }
  if (
    message.toLowerCase().includes('gevaar') ||
    message.toLowerCase().includes('danger') ||
    message.toLowerCase().includes('verlies')
  ) {
    return ShieldAlert;
  }
  if (message.toLowerCase().includes('itm') || message.toLowerCase().includes('strike')) {
    return AlertTriangle;
  }
  if (message.toLowerCase().includes('delta')) {
    return TrendingUp;
  }

  return AlertCircle;
};

export const AlertTooltipContent: React.FC<AlertTooltipContentProps> = ({ items, type }) => {
  const isAlert = type === 'alert';
  const iconBgClass = isAlert
    ? 'bg-caution-50 dark:bg-caution-600/25'
    : 'bg-positive-50 dark:bg-positive-700/25';
  const iconColorClass = isAlert
    ? 'text-caution-600 dark:text-caution-500'
    : 'text-positive-600 dark:text-positive-500';

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const Icon = getIconForMessage(item.message, isAlert);

        return (
          <div key={idx} className="flex items-start gap-2">
            <div className={`p-1 rounded ${iconBgClass} flex-shrink-0 mt-0.5`}>
              <Icon className={`w-3 h-3 ${iconColorClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
                {item.ticker}
              </p>
              <p className="text-xs text-ink-600 dark:text-ink-400 whitespace-pre-line">
                {item.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

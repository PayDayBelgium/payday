import React from 'react';
import { Calendar, TrendingUp, DollarSign, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Event {
  id: string;
  date: string;
  title: string;
  type: 'earnings' | 'fed' | 'inclusion' | 'other';
  ticker?: string;
  description?: string;
}

// Mock data - later this can come from a calendar module
const upcomingEvents: Event[] = [
  {
    id: '1',
    date: '2025-01-16',
    title: 'NVDA Earnings',
    type: 'earnings',
    ticker: 'NVDA',
    description: 'Nvidia Q4 2024 earnings report',
  },
  {
    id: '2',
    date: '2025-01-17',
    title: 'FED Rate Decision',
    type: 'fed',
    description: 'Federal Reserve interest rate announcement',
  },
  {
    id: '3',
    date: '2025-01-20',
    title: 'TSLA Earnings',
    type: 'earnings',
    ticker: 'TSLA',
    description: 'Tesla Q4 2024 earnings report',
  },
  {
    id: '4',
    date: '2025-01-22',
    title: 'MSFT S&P500 Rebalance',
    type: 'inclusion',
    ticker: 'MSFT',
    description: 'S&P 500 index rebalancing',
  },
];

const eventIcons = {
  earnings: TrendingUp,
  fed: DollarSign,
  inclusion: Star,
  other: Calendar,
};

const eventColors = {
  earnings: 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30',
  fed: 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30',
  inclusion: 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30',
  other: 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30',
};

export const UpcomingEvents: React.FC = () => {
  const { t } = useTranslation();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return t('widgetsB.today');
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('widgetsB.tomorrow');
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-primary-700 dark:text-primary-300" />
        <h3 className="text-lg font-semibold text-ink-900 dark:text-white">{t('widgetsB.upcomingEventsTitle')}</h3>
      </div>

      <div className="space-y-3">
        {upcomingEvents.map((event) => {
          const Icon = eventIcons[event.type];
          const colorClass = eventColors[event.type];

          return (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:bg-surface dark:hover:bg-trading-dark-700 transition-colors"
            >
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-900 dark:text-white">
                      {event.title}
                      {event.ticker && (
                        <span className="ml-2 text-xs font-mono text-ink-500 dark:text-ink-400">
                          {event.ticker}
                        </span>
                      )}
                    </p>
                    {event.description && (
                      <p className="text-xs text-ink-600 dark:text-ink-400 mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-ink-500 dark:text-ink-400 whitespace-nowrap">
                    {formatDate(event.date)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

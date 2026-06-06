import React from 'react';
import { Calendar, TrendingUp, DollarSign, Star } from 'lucide-react';

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
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-primary-700 dark:text-primary-300" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Events</h3>
      </div>

      <div className="space-y-3">
        {upcomingEvents.map((event) => {
          const Icon = eventIcons[event.type];
          const colorClass = eventColors[event.type];

          return (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {event.title}
                      {event.ticker && (
                        <span className="ml-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                          {event.ticker}
                        </span>
                      )}
                    </p>
                    {event.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
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

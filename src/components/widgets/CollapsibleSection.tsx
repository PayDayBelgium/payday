import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

/**
 * A collapsible section with a sticky header showing a title, item count,
 * and a chevron toggle. Reuses the same header style as the existing
 * Stocks / LEAPS section headers in PortfolioView.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  count,
  collapsed,
  onToggle,
  children,
}) => {
  return (
    <div className="mb-4">
      <div
        className="px-6 py-2 bg-surface-subtle dark:bg-trading-dark-900/40 border-b border-surface-line dark:border-trading-dark-600 cursor-pointer hover:bg-surface-muted dark:hover:bg-trading-dark-800/60 transition-colors flex items-center gap-2"
        onClick={() => onToggle(id)}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-ink-500 dark:text-ink-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ink-500 dark:text-ink-400 flex-shrink-0" />
        )}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400 flex-1">
          {title}
        </h3>
        <span className="text-xs font-medium text-ink-400 dark:text-ink-500">({count})</span>
      </div>
      {!collapsed && children}
    </div>
  );
};

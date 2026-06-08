import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { POSITION_GRID_COLS, POSITION_GRID_COLS_SUBITEM } from './positionGrid';

type SortField = 'expiration' | 'ticker' | 'strike' | 'premium' | 'dte' | 'pnl';
type SortDirection = 'asc' | 'desc';

export interface PositionColumnHeaderProps {
  sortField?: SortField;
  sortDirection?: SortDirection;
  /** When provided, Ticker/Expiration/Strike/Profit-Loss become sort buttons with chevron
   *  indicators. When omitted, all four are rendered as plain non-interactive labels. */
  onSort?: (field: 'ticker' | 'expiration' | 'strike' | 'pnl') => void;
  /** Align with indented sub-item rows (nested covered calls inside a stock/LEAPS card),
   *  which use the SUBITEM grid with a leading 16px spacer. */
  isSubItem?: boolean;
}

/**
 * Reusable column-header row for the position grid.
 *
 * Two variants:
 * - **Interactive** (`onSort` provided) – Ticker, Expiration, Strike and P/L are
 *   sort buttons with a ChevronUp/ChevronDown active-sort indicator.
 * - **Labels-only** (`onSort` omitted) – all cells are plain text; used inside
 *   stock/LEAPS cards above nested covered-call rows.
 *
 * The outer `<div>` uses the identical class string that was previously inlined in
 * PortfolioView, and the inner grid uses `POSITION_GRID_COLS` — the same constant
 * used by OptionRow — so every column aligns perfectly.
 */
export const PositionColumnHeader: React.FC<PositionColumnHeaderProps> = ({
  sortField,
  sortDirection,
  onSort,
  isSubItem = false,
}) => {
  const { t } = useTranslation();

  /** Renders a sortable or plain label cell for one of the four sort-capable columns. */
  const sortableCell = (field: 'ticker' | 'expiration' | 'strike' | 'pnl', label: string) => {
    if (!onSort) {
      return <div>{label}</div>;
    }
    const isActive = sortField === field;
    return (
      <button
        onClick={() => onSort(field)}
        className="text-left hover:text-ink-900 dark:hover:text-ink-200 flex items-center gap-1"
      >
        {label}{' '}
        {isActive &&
          (sortDirection === 'asc' ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          ))}
      </button>
    );
  };

  return (
    <div className="px-6 py-2 bg-surface-subtle dark:bg-trading-dark-900/50 border-b border-surface-line dark:border-trading-dark-600 border-l-4 border-l-transparent">
      <div
        className={`grid ${isSubItem ? POSITION_GRID_COLS_SUBITEM : POSITION_GRID_COLS} gap-2 text-xs font-semibold text-ink-600 dark:text-ink-400 items-center`}
      >
        {isSubItem && <div></div>} {/* Leading 16px spacer (sub-item alignment) */}
        <div></div> {/* Icon */}
        {sortableCell('ticker', t('widgetsB.colTicker'))}
        {sortableCell('expiration', t('widgetsB.colExpiration'))}
        {sortableCell('strike', t('widgetsB.colStrike'))}
        <div>{t('widgetsB.colStockPrice')}</div>
        <div>{t('widgetsB.colDifference')}</div>
        <div>{t('widgetsB.colOpen')}</div>
        <div>{t('widgetsB.colCurrent')}</div>
        {sortableCell('pnl', t('widgetsB.colProfitLoss'))}
        <div>{t('widgetsB.colCollateral')}</div>
        <div></div> {/* Spacer */}
        <div className="text-right">{t('widgetsB.colActions')}</div>
      </div>
    </div>
  );
};

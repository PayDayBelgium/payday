import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, Eye, Briefcase, ExternalLink, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import {
  addToWatchlist,
  removeTicker,
  updateTicker,
} from '../../store/commands/tickerCommands';
import { updateTickerPrice } from '../../store/slices/tickersSlice';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import type { PortfolioName, Ticker, Position } from '../../types';
import { formatNumber } from '../../utils/numberFormat';

interface TickerWithPositions extends Ticker {
  portfolios: PortfolioName[];
  totalShares: number;
  totalValue: number;
  averagePrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  hasPositions: boolean;
}

export const TickersOverview: React.FC = () => {
  const { t } = useTranslation();
  const { setPageTitle } = usePageTitle();
  const dispatch = useAppDispatch();
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const positions = useAppSelector((state) => state.positions.positions);
  const tickers = useAppSelector(selectAllTickers);

  const [selectedPortfolios, setSelectedPortfolios] = useState<PortfolioName[]>([]);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [isAddWatchlistOpen, setIsAddWatchlistOpen] = useState(false);
  const [newWatchlistTicker, setNewWatchlistTicker] = useState({ symbol: '', name: '', price: '' });
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; price: string }>({
    name: '',
    price: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    symbol: string;
    name: string;
  }>({
    isOpen: false,
    symbol: '',
    name: '',
  });

  useEffect(() => {
    setPageTitle('Ticker Overview', t('pagesA.tickers.pageSubtitle'));
  }, [setPageTitle, t]);

  // Helper function to generate Yahoo Finance URL
  const getYahooFinanceUrl = (ticker: string) => {
    return `https://finance.yahoo.com/quote/${ticker}/`;
  };

  // Build ticker data from positions and centralized tickers
  const tickerData: TickerWithPositions[] = useMemo(() => {
    const tickerMap = new Map<string, TickerWithPositions>();

    // First, add all tickers from the store
    tickers.forEach((ticker) => {
      tickerMap.set(ticker.symbol.toUpperCase(), {
        ...ticker,
        portfolios: [],
        totalShares: 0,
        totalValue: 0,
        averagePrice: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        hasPositions: false,
      });
    });

    // Then, process positions to build portfolio data
    const openPositions = positions.filter((p) => p.status === 'open');

    openPositions.forEach((position: Position) => {
      const symbol = position.ticker.toUpperCase();

      // Only process stock/ETF positions for now
      if (position.type !== 'stock' && position.type !== 'etf') return;

      const stockPosition = position as any; // Cast to access stock-specific fields

      let tickerEntry = tickerMap.get(symbol);

      if (!tickerEntry) {
        // Create a new ticker entry if it doesn't exist
        tickerEntry = {
          symbol,
          name: position.name || symbol,
          type: position.type as 'stock' | 'etf',
          optionsAvailable: true,
          miniContractsAvailable: false,
          currentPrice: 0,
          isWatchlist: false,
          portfolios: [],
          totalShares: 0,
          totalValue: 0,
          averagePrice: 0,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          hasPositions: false,
        };
        tickerMap.set(symbol, tickerEntry);
      }

      // Add portfolio if not already included
      if (!tickerEntry.portfolios.includes(position.portfolio)) {
        tickerEntry.portfolios.push(position.portfolio);
      }

      // Aggregate position data
      const shares = stockPosition.shares || 0;
      const costBasis = stockPosition.costBasis || 0;
      const currentValue = stockPosition.currentValue || 0;

      tickerEntry.totalShares += shares;
      tickerEntry.totalValue += currentValue;

      // Update average price (weighted)
      const totalCost = tickerEntry.averagePrice * (tickerEntry.totalShares - shares) + costBasis;
      tickerEntry.averagePrice =
        tickerEntry.totalShares > 0 ? totalCost / tickerEntry.totalShares : 0;

      tickerEntry.hasPositions = true;
    });

    // Calculate unrealized P&L for each ticker
    tickerMap.forEach((ticker) => {
      if (ticker.totalShares > 0 && ticker.currentPrice) {
        const marketValue = ticker.totalShares * ticker.currentPrice;
        const costBasis = ticker.totalShares * ticker.averagePrice;
        ticker.unrealizedPnL = marketValue - costBasis;
        ticker.unrealizedPnLPercent = costBasis > 0 ? (ticker.unrealizedPnL / costBasis) * 100 : 0;
        ticker.totalValue = marketValue;
      }
    });

    return Array.from(tickerMap.values());
  }, [tickers, positions]);

  const togglePortfolioFilter = (portfolio: PortfolioName) => {
    setSelectedPortfolios((prev) =>
      prev.includes(portfolio) ? prev.filter((b) => b !== portfolio) : [...prev, portfolio]
    );
  };

  const filteredTickers = useMemo(() => {
    let filtered = tickerData;

    // Filter by portfolios
    if (selectedPortfolios.length > 0) {
      filtered = filtered.filter(
        (ticker) =>
          ticker.portfolios.some((b) => selectedPortfolios.includes(b)) ||
          (ticker.isWatchlist && selectedPortfolios.length === 0)
      );
    }

    // Filter by watchlist
    if (showWatchlistOnly) {
      filtered = filtered.filter((ticker) => ticker.isWatchlist);
    }

    return filtered;
  }, [tickerData, selectedPortfolios, showWatchlistOnly]);

  const handleAddWatchlist = () => {
    if (!newWatchlistTicker.symbol.trim()) return;

    const ticker: Ticker = {
      symbol: newWatchlistTicker.symbol.toUpperCase(),
      name: newWatchlistTicker.name || newWatchlistTicker.symbol.toUpperCase(),
      type: 'stock',
      optionsAvailable: true,
      miniContractsAvailable: false,
      hasDividend: false,
      currentPrice: newWatchlistTicker.price ? parseFloat(newWatchlistTicker.price) : undefined,
      isWatchlist: true,
    };

    dispatch(addToWatchlist(ticker, new Date().toISOString()));
    setNewWatchlistTicker({ symbol: '', name: '', price: '' });
    setIsAddWatchlistOpen(false);
  };

  const handleDeleteTicker = (symbol: string, name: string) => {
    setDeleteConfirm({ isOpen: true, symbol, name });
  };

  const confirmDeleteTicker = () => {
    dispatch(removeTicker(deleteConfirm.symbol, new Date().toISOString()));
    setDeleteConfirm({ isOpen: false, symbol: '', name: '' });
  };

  const startEditing = (ticker: TickerWithPositions) => {
    setEditingTicker(ticker.symbol);
    setEditValues({
      name: ticker.name,
      price: ticker.currentPrice?.toString() || '',
    });
  };

  const saveEdit = (symbol: string) => {
    // Name/metadata is an event-sourced intent; the live price is runtime-only
    // (not part of the event log), so set it via the runtime price reducer.
    dispatch(updateTicker({ symbol, name: editValues.name }, new Date().toISOString()));
    if (editValues.price) {
      dispatch(updateTickerPrice({ symbol, price: parseFloat(editValues.price) }));
    }
    setEditingTicker(null);
  };

  const cancelEdit = () => {
    setEditingTicker(null);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-ink-600 dark:text-ink-400" />
              <span className="text-sm font-medium text-ink-700 dark:text-ink-300">Filters:</span>
            </div>

            {/* Portfolio filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {portfolios.map((portfolio) => (
                <button
                  key={portfolio.id}
                  onClick={() => togglePortfolioFilter(portfolio.name)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedPortfolios.includes(portfolio.name)
                      ? 'bg-primary-700 text-white'
                      : 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-700 dark:text-ink-300 hover:bg-surface-muted dark:hover:bg-trading-dark-600'
                  }`}
                >
                  <img
                    src={portfolio.logo}
                    alt={portfolio.name}
                    className="w-4 h-4 rounded object-contain"
                  />
                  {portfolio.name}
                </button>
              ))}
            </div>

            {/* Watchlist filter */}
            <button
              onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showWatchlistOnly
                  ? 'bg-primary-700 text-white'
                  : 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-700 dark:text-ink-300 hover:bg-surface-muted dark:hover:bg-trading-dark-600'
              }`}
            >
              <Eye className="w-4 h-4" />
              Watchlist Only
            </button>

            {/* Clear filters */}
            {(selectedPortfolios.length > 0 || showWatchlistOnly) && (
              <button
                onClick={() => {
                  setSelectedPortfolios([]);
                  setShowWatchlistOnly(false);
                }}
                className="text-sm text-primary-700 dark:text-primary-300 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Add to Watchlist button */}
          <button
            onClick={() => setIsAddWatchlistOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Watchlist
          </button>
        </div>
      </div>

      {/* Add Watchlist Modal */}
      {isAddWatchlistOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-xl p-6 w-full max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              if (newWatchlistTicker.symbol.trim()) {
                handleAddWatchlist();
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white">
                {t('pagesA.tickers.addToWatchlistTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddWatchlistOpen(false)}
                className="p-1 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded"
              >
                <X className="w-5 h-5 text-ink-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={newWatchlistTicker.symbol}
                  onChange={(e) =>
                    setNewWatchlistTicker((prev) => ({
                      ...prev,
                      symbol: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white"
                  placeholder="AAPL"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                  {t('pagesA.tickers.colName')}
                </label>
                <input
                  type="text"
                  value={newWatchlistTicker.name}
                  onChange={(e) =>
                    setNewWatchlistTicker((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white"
                  placeholder="Apple Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                  {t('pagesA.tickers.currentPrice')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newWatchlistTicker.price}
                  onChange={(e) =>
                    setNewWatchlistTicker((prev) => ({ ...prev, price: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white"
                  placeholder="150.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsAddWatchlistOpen(false)}
                className="px-4 py-2 text-ink-700 dark:text-ink-300 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-lg transition-colors"
              >
                {t('pagesA.common.cancel')}
              </button>
              <button
                type="submit"
                disabled={!newWatchlistTicker.symbol.trim()}
                className="px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('pagesA.common.add')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickers List */}
      <div className="bg-surface dark:bg-trading-dark-800/50 rounded-lg border border-surface-line dark:border-trading-dark-600 overflow-hidden">
        {/* Column Headers */}
        <div className="px-6 py-2 bg-surface-subtle dark:bg-trading-dark-900/50 border-b border-surface-line dark:border-trading-dark-600">
          <div className="grid grid-cols-[70px_minmax(150px,2fr)_80px_70px_70px_80px_90px_100px_80px_80px] gap-2 text-xs font-semibold text-ink-600 dark:text-ink-400 items-center">
            <div>Ticker</div>
            <div>{t('pagesA.tickers.colName')}</div>
            <div>Portfolios</div>
            <div className="text-right">Shares</div>
            <div className="text-right">Avg Price</div>
            <div className="text-right">{t('pagesA.tickers.colPrice')}</div>
            <div className="text-right">Market Value</div>
            <div className="text-right">P&L</div>
            <div className="text-center">Status</div>
            <div className="text-right">Actions</div>
          </div>
        </div>

        {/* Ticker Rows */}
        <div className="divide-y divide-surface-line dark:divide-trading-dark-600">
          {filteredTickers.map((ticker) => (
            <div
              key={ticker.symbol}
              className="px-6 py-3 hover:bg-white dark:hover:bg-trading-dark-700/30 transition-colors"
            >
              <div className="grid grid-cols-[70px_minmax(150px,2fr)_80px_70px_70px_80px_90px_100px_80px_80px] gap-2 items-center">
                {/* Ticker Symbol */}
                <div>
                  <a
                    href={getYahooFinanceUrl(ticker.symbol)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono font-bold text-sm text-ink-900 dark:text-white hover:text-primary-700 dark:hover:text-primary-500 transition-colors group"
                    title="View on Yahoo Finance"
                  >
                    {ticker.symbol}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary-700 dark:text-primary-300" />
                  </a>
                </div>

                {/* Name */}
                <div>
                  {editingTicker === ticker.symbol ? (
                    <input
                      type="text"
                      value={editValues.name}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-2 py-1 border border-ink-200 dark:border-trading-dark-500 rounded bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white text-sm"
                    />
                  ) : (
                    <span className="text-sm text-ink-600 dark:text-ink-300 truncate block">
                      {ticker.name}
                    </span>
                  )}
                </div>

                {/* Portfolios */}
                <div className="flex items-center gap-1">
                  {ticker.portfolios.map((portfolio) => {
                    const portfolioData = portfolios.find((b) => b.name === portfolio);
                    return portfolioData ? (
                      <img
                        key={portfolio}
                        src={portfolioData.logo}
                        alt={portfolio}
                        title={portfolio}
                        className="w-4 h-4 rounded object-contain"
                      />
                    ) : null;
                  })}
                  {ticker.portfolios.length === 0 && (
                    <span className="text-ink-400 dark:text-ink-600 text-xs">-</span>
                  )}
                </div>

                {/* Shares */}
                <div className="text-right text-sm font-medium text-ink-900 dark:text-white">
                  {ticker.totalShares > 0 ? ticker.totalShares.toLocaleString() : '-'}
                </div>

                {/* Avg Price */}
                <div className="text-right text-xs text-ink-500 dark:text-ink-400">
                  {ticker.averagePrice > 0 ? `$${formatNumber(ticker.averagePrice, 2)}` : '-'}
                </div>

                {/* Current Price */}
                <div className="text-right">
                  {editingTicker === ticker.symbol ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editValues.price}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, price: e.target.value }))
                      }
                      className="w-full px-2 py-1 border border-ink-200 dark:border-trading-dark-500 rounded bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white text-xs text-right"
                    />
                  ) : (
                    <span className="text-sm font-medium text-ink-900 dark:text-white">
                      {ticker.currentPrice ? `$${formatNumber(ticker.currentPrice, 2)}` : '-'}
                    </span>
                  )}
                </div>

                {/* Market Value */}
                <div className="text-right text-sm font-medium text-ink-900 dark:text-white">
                  {ticker.totalValue > 0
                    ? `$${ticker.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '-'}
                </div>

                {/* Unrealized P&L */}
                <div className="text-right">
                  {ticker.unrealizedPnL !== 0 ? (
                    <div
                      className={`text-sm font-semibold ${ticker.unrealizedPnL >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
                    >
                      <div>
                        {ticker.unrealizedPnL >= 0 ? '+' : ''}$
                        {Math.abs(ticker.unrealizedPnL).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[10px]">
                        {ticker.unrealizedPnLPercent >= 0 ? '+' : ''}
                        {formatNumber(ticker.unrealizedPnLPercent, 2)}%
                      </div>
                    </div>
                  ) : (
                    <span className="text-ink-400 dark:text-ink-600 text-xs">-</span>
                  )}
                </div>

                {/* Status */}
                <div className="text-center">
                  {ticker.isWatchlist && !ticker.hasPositions ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-[10px] font-medium">
                      <Eye className="w-2.5 h-2.5" />
                      Watch
                    </span>
                  ) : ticker.hasPositions ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded text-[10px] font-medium">
                      <Briefcase className="w-2.5 h-2.5" />
                      Active
                    </span>
                  ) : (
                    <span className="text-ink-400 dark:text-ink-600 text-xs">-</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  {editingTicker === ticker.symbol ? (
                    <>
                      <button
                        onClick={() => saveEdit(ticker.symbol)}
                        className="p-1 hover:bg-positive-50 dark:hover:bg-positive-700/25 text-positive-600 dark:text-positive-500 rounded transition-colors"
                        title={t('pagesA.common.save')}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 text-ink-600 dark:text-ink-400 rounded transition-colors"
                        title={t('pagesA.common.cancel')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(ticker)}
                        className="p-1 hover:bg-primary-50 dark:hover:bg-primary-900/25 text-primary-700 dark:text-primary-300 rounded transition-colors"
                        title={t('pagesA.common.edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {ticker.isWatchlist && !ticker.hasPositions && (
                        <button
                          onClick={() => handleDeleteTicker(ticker.symbol, ticker.name)}
                          className="p-1 hover:bg-negative-50 dark:hover:bg-negative-700/25 text-negative-600 dark:text-negative-500 rounded transition-colors"
                          title={t('pagesA.common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTickers.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-ink-500 dark:text-ink-400">{t('pagesA.tickers.emptyTitle')}</p>
            <p className="text-sm text-ink-400 dark:text-ink-500 mt-1">
              {t('pagesA.tickers.emptyDesc')}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, symbol: '', name: '' })}
          onConfirm={confirmDeleteTicker}
          title={t('pagesA.tickers.deleteTitle')}
          message={t('pagesA.tickers.deleteMessage', {
            symbol: deleteConfirm.symbol,
            name: deleteConfirm.name,
          })}
          confirmText={t('pagesA.common.delete')}
          cancelText={t('pagesA.common.cancel')}
          variant="danger"
        />
      )}
    </div>
  );
};

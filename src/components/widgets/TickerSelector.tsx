import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, TrendingUp, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectTickersSorted } from '../../store/slices/tickersSlice';
import { updateTicker } from '../../store/commands/tickerCommands';
import type { Ticker } from '../../types';

interface TickerSelectorProps {
  value: string;
  onChange: (ticker: Ticker) => void;
  onCreateNew?: (symbol: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const TickerSelector: React.FC<TickerSelectorProps> = ({
  value,
  onChange,
  onCreateNew,
  placeholder,
  className = '',
  autoFocus = false,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const tickers = useAppSelector(selectTickersSorted);

  const [searchTerm, setSearchTerm] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync searchTerm with value when value changes externally
  // Also close dropdown when value is set (e.g., after ticker creation)
  React.useEffect(() => {
    if (value && value !== searchTerm) {
      setSearchTerm(value);
      setIsOpen(false); // Close dropdown when value is programmatically set
    }
  }, [value]);

  // Auto focus the input when autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Filter tickers based on search term
  const filteredTickers = searchTerm
    ? tickers.filter(
        (ticker) =>
          ticker.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticker.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tickers;

  const showCreateNew =
    searchTerm && !tickers.some((t) => t.symbol.toLowerCase() === searchTerm.toLowerCase());

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (ticker: Ticker) => {
    onChange(ticker);
    setSearchTerm(ticker.symbol);
    setIsOpen(false);

    // Update lastUsed timestamp so the ticker sorts to the top of the list.
    const ts = new Date().toISOString();
    dispatch(updateTicker({ symbol: ticker.symbol, lastUsed: ts }, ts));
  };

  const handleCreateNew = () => {
    if (onCreateNew && searchTerm) {
      onCreateNew(searchTerm.toUpperCase());
      setSearchTerm('');
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    const maxIndex = showCreateNew ? filteredTickers.length : filteredTickers.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (showCreateNew && highlightedIndex === filteredTickers.length) {
          handleCreateNew();
        } else if (filteredTickers[highlightedIndex]) {
          handleSelect(filteredTickers[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-ink-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            // Only open dropdown on focus if there's no value selected
            // This prevents reopening after ticker creation
            if (!value) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
          placeholder={placeholder ?? t('compCommon.searchOrAddTicker')}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white dark:bg-trading-dark-800 rounded-lg shadow-lg border border-surface-line dark:border-trading-dark-600 max-h-64 overflow-y-auto"
        >
          {filteredTickers.length === 0 && !showCreateNew ? (
            <div className="px-4 py-8 text-center text-ink-500 dark:text-ink-400">
              <p className="text-sm">{t('compCommon.noTickersFound')}</p>
              <p className="text-xs mt-1">{t('compCommon.typeTickerToAdd')}</p>
            </div>
          ) : (
            <>
              {filteredTickers.map((ticker, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={ticker.symbol}
                    onClick={() => handleSelect(ticker)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-surface dark:hover:bg-trading-dark-700 transition-colors ${
                      isHighlighted ? 'bg-surface dark:bg-trading-dark-700' : ''
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        ticker.type === 'stock'
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500'
                      }`}
                    >
                      {ticker.type === 'stock' ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-900 dark:text-white">
                          {ticker.symbol}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            ticker.type === 'stock'
                              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                              : 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500'
                          }`}
                        >
                          {ticker.type === 'stock'
                            ? t('compCommon.stockBadge')
                            : t('compCommon.etfBadge')}
                        </span>
                      </div>
                      <p className="text-sm text-ink-600 dark:text-ink-400 truncate">
                        {ticker.name}
                      </p>
                      {ticker.optionsAvailable && (
                        <p className="text-xs text-ink-500 dark:text-ink-500 mt-0.5">
                          {t('compCommon.optionsAvailable')}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Create New Option */}
              {showCreateNew && onCreateNew && (
                <button
                  onClick={handleCreateNew}
                  className={`w-full px-4 py-3 flex items-center gap-3 border-t border-surface-line dark:border-trading-dark-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors ${
                    highlightedIndex === filteredTickers.length
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-primary-700 dark:text-primary-300">
                      {t('compCommon.addNewTicker', { symbol: searchTerm.toUpperCase() })}
                    </span>
                    <p className="text-sm text-ink-600 dark:text-ink-400">
                      {t('compCommon.clickToFillDetails')}
                    </p>
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

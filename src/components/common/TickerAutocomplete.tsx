import React, { useState, useRef, useEffect, useId } from 'react';
import { Search } from 'lucide-react';
import type { TickerSuggestion } from './TickerAutocomplete.types';

export type { TickerSuggestion } from './TickerAutocomplete.types';

interface TickerAutocompleteProps {
  value: string;
  name: string;
  onTickerChange: (ticker: string, name: string) => void;
  onNameChange: (name: string) => void;
  suggestions: TickerSuggestion[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const TickerAutocomplete: React.FC<TickerAutocompleteProps> = ({
  value,
  name,
  onTickerChange,
  onNameChange,
  suggestions,
  placeholder = 'AAPL',
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<TickerSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stable ids for the WAI-ARIA combobox structure
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  // Filter suggestions based on input
  useEffect(() => {
    if (value.length === 0) {
      setFilteredSuggestions([]);
      setIsOpen(false);
      return;
    }

    const filtered = suggestions.filter(
      (s) =>
        s.ticker.toLowerCase().includes(value.toLowerCase()) ||
        s.name.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredSuggestions(filtered);
    setIsOpen(filtered.length > 0);
    setSelectedIndex(-1);
  }, [value, suggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTickerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onTickerChange(newValue, name);
  };

  const handleSelectSuggestion = (suggestion: TickerSuggestion) => {
    onTickerChange(suggestion.ticker, suggestion.name);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Ticker Input with Autocomplete */}
      <div ref={wrapperRef} className="relative">
        <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
          Ticker symbool {required && <span className="text-negative-600">*</span>}
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            required={required}
            value={value}
            onChange={handleTickerInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (filteredSuggestions.length > 0) {
                setIsOpen(true);
              }
            }}
            className={`w-full px-3 py-2 pr-10 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent ${className}`}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen && filteredSuggestions.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={selectedIndex >= 0 ? optionId(selectedIndex) : undefined}
          />
          <Search className="absolute right-3 top-2.5 w-5 h-5 text-ink-400" />
        </div>

        {/* Dropdown Suggestions */}
        {isOpen && filteredSuggestions.length > 0 && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white dark:bg-trading-dark-800 border border-ink-200 dark:border-trading-dark-500 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.ticker}-${index}`}
                id={optionId(index)}
                role="option"
                aria-selected={index === selectedIndex}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-4 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors ${
                  index === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                } ${
                  index === 0
                    ? 'rounded-t-lg'
                    : index === filteredSuggestions.length - 1
                      ? 'rounded-b-lg'
                      : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-ink-900 dark:text-white">
                      {suggestion.ticker}
                    </div>
                    <div className="text-sm text-ink-600 dark:text-ink-400">{suggestion.name}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Name Input */}
      <div>
        <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
          Naam (Optioneel)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Apple Inc."
        />
      </div>
    </div>
  );
};

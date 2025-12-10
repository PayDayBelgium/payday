import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FridayDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
}

/**
 * Date picker with arrow buttons to navigate to previous/next Friday
 * Useful for options expiration date selection
 */
export const FridayDatePicker: React.FC<FridayDatePickerProps> = ({
  value,
  onChange,
  className = '',
  required = false,
  disabled = false,
  min,
  max,
}) => {
  // Get the next Friday from a given date
  const getNextFriday = (date: Date): Date => {
    const result = new Date(date);
    const dayOfWeek = result.getDay();
    // Calculate days until next Friday (5 = Friday)
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    result.setDate(result.getDate() + daysUntilFriday);
    return result;
  };

  // Get the previous Friday from a given date
  const getPreviousFriday = (date: Date): Date => {
    const result = new Date(date);
    const dayOfWeek = result.getDay();
    // Calculate days since last Friday
    const daysSinceFriday = (dayOfWeek + 2) % 7 || 7;
    result.setDate(result.getDate() - daysSinceFriday);
    return result;
  };

  // Format date to YYYY-MM-DD for input value
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Handle next Friday click
  const handleNextFriday = () => {
    if (disabled) return;

    let baseDate: Date;
    if (value) {
      baseDate = new Date(value);
    } else {
      baseDate = new Date();
    }

    const nextFriday = getNextFriday(baseDate);
    const newValue = formatDateForInput(nextFriday);

    // Check max constraint
    if (max && newValue > max) return;

    onChange(newValue);
  };

  // Handle previous Friday click
  const handlePreviousFriday = () => {
    if (disabled || !value) return;

    const baseDate = new Date(value);
    const prevFriday = getPreviousFriday(baseDate);
    const newValue = formatDateForInput(prevFriday);

    // Check min constraint
    if (min && newValue < min) return;

    onChange(newValue);
  };

  // Check if previous button should be disabled
  const isPrevDisabled = disabled || !value || (min && getPreviousFriday(new Date(value)).toISOString().split('T')[0] < min);

  // Check if next button should be disabled
  const isNextDisabled = disabled || (max && getNextFriday(value ? new Date(value) : new Date()).toISOString().split('T')[0] > max);

  return (
    <div className="flex items-stretch">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} rounded-r-none border-r-0`}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
      />

      <div className="flex border border-gray-300 dark:border-gray-600 rounded-r-lg overflow-hidden">
        <button
          type="button"
          onClick={handlePreviousFriday}
          disabled={isPrevDisabled}
          className="w-8 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-50 dark:disabled:hover:bg-gray-700 border-r border-gray-300 dark:border-gray-600"
          title="Vorige vrijdag"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleNextFriday}
          disabled={isNextDisabled}
          className="w-9 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-50 dark:disabled:hover:bg-gray-700"
          title="Volgende vrijdag"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

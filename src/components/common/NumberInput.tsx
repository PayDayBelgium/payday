import React, { useState, useEffect } from 'react';
import { getDecimalSeparator, parseLocalizedNumber } from '../../utils/numberFormat';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  allowDecimals?: boolean;
}

/**
 * NumberInput component that uses the browser's locale for decimal separator
 * Supports both comma (,) and period (.) as decimal separators
 */
export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 0.01,
  placeholder = '0',
  className = '',
  required = false,
  disabled = false,
  allowDecimals = true,
}) => {
  const decimalSeparator = getDecimalSeparator();

  // Convert number to string using locale decimal separator
  const formatNumberForInput = (num: number): string => {
    if (num === 0 || isNaN(num)) return '';
    return num.toString().replace('.', decimalSeparator);
  };

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState<string>(formatNumberForInput(value));
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  // Update display value when prop value changes (but not while user is typing)
  useEffect(() => {
    if (document.activeElement !== inputRef.current && !isEmpty) {
      setDisplayValue(formatNumberForInput(value));
    }
  }, [value, isEmpty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Allow empty input
    if (input === '') {
      setDisplayValue('');
      setIsEmpty(true);
      onChange(0);
      return;
    }

    setIsEmpty(false);

    // If decimals not allowed, only allow digits and minus sign
    if (!allowDecimals) {
      const regex = /^-?\d*$/;
      if (!regex.test(input)) {
        return; // Reject invalid input
      }
    } else {
      // Allow digits, comma, period, and minus sign
      const regex = /^-?[\d,\.]*$/;
      if (!regex.test(input)) {
        return; // Reject invalid input
      }

      // Only allow one decimal separator
      const separatorCount = (input.match(/[,\.]/g) || []).length;
      if (separatorCount > 1) {
        return;
      }
    }

    setDisplayValue(input);

    // Parse and validate
    const numValue = parseLocalizedNumber(input);

    // Apply min/max constraints
    let constrainedValue = numValue;
    if (min !== undefined && numValue < min) {
      constrainedValue = min;
    }
    if (max !== undefined && numValue > max) {
      constrainedValue = max;
    }

    onChange(constrainedValue);
  };

  const handleBlur = () => {
    // Format the value on blur
    const numValue = parseLocalizedNumber(displayValue);
    setDisplayValue(formatNumberForInput(numValue));
    setIsEmpty(false);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      required={required}
      disabled={disabled}
    />
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { parseLocalizedNumber, getDecimalSeparator, formatNumber } from '../../utils/numberFormat';
import { validateNumberInput } from '../modals/optionWizardUtils';

interface LocalizedNumberInputProps {
  /** The numeric (parsed) value. */
  value: number;
  /** Returns the PARSED numeric value on valid input. */
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Reusable locale-aware number input.
 *
 * Internally manages a "text-shadow" state (the user's raw input) so the user can
 * type freely with locale separators, while externally the parsed number is always
 * returned via onChange.
 *
 * - validateNumberInput rejects invalid input (as previously done in the wizards).
 * - parseLocalizedNumber converts the text into a number.
 * - When the numeric prop value changes externally (e.g. reset to 0 or an imported
 *   value) and no longer matches the current text, the text state is synchronized
 *   to it.
 */
export const LocalizedNumberInput = React.forwardRef<HTMLInputElement, LocalizedNumberInputProps>(
  ({ value, onChange, placeholder, className }, ref) => {
    // Internal text-shadow state, initialized from the prop value.
    const [text, setText] = useState(() => (value ? formatNumber(value, 2) : ''));

    // Track the last numeric value we ourselves emitted, so we can distinguish
    // external changes (reset/import) from the user's own typing.
    const lastEmittedRef = useRef(value);

    useEffect(() => {
      // Only synchronize if the external value really differs from what we last
      // emitted (e.g. parent resets to 0 or sets an imported value).
      if (value !== lastEmittedRef.current) {
        lastEmittedRef.current = value;
        setText(value ? formatNumber(value, 2) : '');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (validateNumberInput(raw)) {
        setText(raw);
        const parsed = parseLocalizedNumber(raw);
        lastEmittedRef.current = parsed;
        onChange(parsed);
      }
    };

    return (
      <input
        ref={ref}
        type="text"
        value={text}
        onChange={handleChange}
        className={className}
        placeholder={placeholder ?? `150${getDecimalSeparator()}00`}
      />
    );
  }
);

LocalizedNumberInput.displayName = 'LocalizedNumberInput';

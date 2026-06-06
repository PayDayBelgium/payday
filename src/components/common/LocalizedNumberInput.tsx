import React, { useEffect, useRef, useState } from 'react';
import {
  parseLocalizedNumber,
  getDecimalSeparator,
  formatNumber,
} from '../../utils/numberFormat';
import { validateNumberInput } from '../modals/optionWizardUtils';

interface LocalizedNumberInputProps {
  /** De numerieke (geparseerde) waarde. */
  value: number;
  /** Geeft de GEPARSEERDE numerieke waarde terug bij geldige invoer. */
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Herbruikbare locale-bewuste getal-input.
 *
 * Beheert intern een "text-shadow" state (de rauwe invoer van de gebruiker) zodat de
 * gebruiker vrij kan typen met locale-separators, terwijl naar buiten toe altijd de
 * geparseerde number wordt teruggegeven via onChange.
 *
 * - validateNumberInput weert ongeldige invoer (zoals voorheen in de wizards).
 * - parseLocalizedNumber zet de tekst om naar een number.
 * - Wanneer de numerieke prop-waarde van buitenaf wijzigt (bv. reset naar 0 of een
 *   geïmporteerde waarde) en niet meer overeenkomt met de huidige tekst, wordt de
 *   tekst-state daarop gesynchroniseerd.
 */
export const LocalizedNumberInput = React.forwardRef<HTMLInputElement, LocalizedNumberInputProps>(
  ({ value, onChange, placeholder, className }, ref) => {
    // Interne text-shadow state, geïnitialiseerd vanuit de prop value.
    const [text, setText] = useState(() => (value ? formatNumber(value, 2) : ''));

    // Houd de laatste numerieke waarde bij die wij zelf naar buiten stuurden,
    // zodat we externe wijzigingen (reset/import) kunnen onderscheiden van eigen typen.
    const lastEmittedRef = useRef(value);

    useEffect(() => {
      // Alleen synchroniseren als de externe waarde echt afwijkt van wat wij laatst
      // hebben uitgestuurd (bv. parent reset naar 0 of zet een geïmporteerde waarde).
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

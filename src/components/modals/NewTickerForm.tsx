import React from 'react';
import { Info } from 'lucide-react';
import type { NewTickerData } from './optionWizardUtils';

interface NewTickerFormLabels {
  /** Heading shown before the symbol, e.g. t('callWizard.tickerStep.newTicker') */
  newTickerHeading: string;
  newTickerDesc: string;
  companyName: string;
  companyPlaceholder: string;
  type: string;
  stock: string;
  etf: string;
  optionsAvailableCheck: string;
  miniContractsCheck: string;
  miniContractsTooltip: string;
  addTicker: string;
  cancel: string;
}

interface NewTickerFormProps {
  data: NewTickerData;
  onChange: (data: NewTickerData) => void;
  onSave: () => void;
  onCancel: () => void;
  labels: NewTickerFormLabels;
}

/**
 * Inline "create new ticker" sub-form shared by CallOptionWizard and PutOptionWizard.
 * Markup/classes are identical between the two wizards; only the (NL) strings differ,
 * which are passed in via `labels`.
 */
export const NewTickerForm: React.FC<NewTickerFormProps> = ({
  data,
  onChange,
  onSave,
  onCancel,
  labels,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
        <h4 className="font-semibold text-primary-900 dark:text-primary-300 mb-2">
          {labels.newTickerHeading} {data.symbol}
        </h4>
        <p className="text-sm text-primary-700 dark:text-primary-300">{labels.newTickerDesc}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {labels.companyName}
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder={labels.companyPlaceholder}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {labels.type}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onChange({ ...data, type: 'stock' })}
            className={`p-3 rounded-lg border-2 transition-all ${
              data.type === 'stock'
                ? 'border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <p className="font-medium text-gray-900 dark:text-white">{labels.stock}</p>
          </button>
          <button
            onClick={() => onChange({ ...data, type: 'etf' })}
            className={`p-3 rounded-lg border-2 transition-all ${
              data.type === 'etf'
                ? 'border-positive-600 bg-positive-50 dark:bg-positive-700/15'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <p className="font-medium text-gray-900 dark:text-white">{labels.etf}</p>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.optionsAvailable}
            onChange={(e) =>
              onChange({
                ...data,
                optionsAvailable: e.target.checked,
              })
            }
            className="w-4 h-4 text-primary-700 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {labels.optionsAvailableCheck}
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.miniContractsAvailable}
            onChange={(e) =>
              onChange({
                ...data,
                miniContractsAvailable: e.target.checked,
              })
            }
            className="w-4 h-4 text-primary-700 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            {labels.miniContractsCheck}
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
                {labels.miniContractsTooltip}
              </div>
            </div>
          </span>
        </label>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={!data.name}
          className="flex-1 px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {labels.addTicker}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
        >
          {labels.cancel}
        </button>
      </div>
    </div>
  );
};

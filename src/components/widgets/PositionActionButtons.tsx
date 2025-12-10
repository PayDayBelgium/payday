import React from 'react';
import { Redo2, X as XIcon, Layers, ArrowDownLeft } from 'lucide-react';

interface PositionActionButtonsProps {
  onRoll?: () => void;
  onClose?: () => void;
  onAssign?: () => void;
  onNavigateToCampaigns?: () => void;
  // Labels for tooltips
  rollTitle?: string;
  closeTitle?: string;
  assignTitle?: string;
  campaignTitle?: string;
}

export const PositionActionButtons: React.FC<PositionActionButtonsProps> = ({
  onRoll,
  onClose,
  onAssign,
  onNavigateToCampaigns,
  rollTitle = 'Roll Optie',
  closeTitle = 'Positie sluiten',
  assignTitle = 'Assignment',
  campaignTitle = 'Bekijk Campagne',
}) => {
  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        {/* Assignment button - leftmost */}
        {onAssign && (
          <button
            onClick={onAssign}
            className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded"
            title={assignTitle}
          >
            <ArrowDownLeft className="w-4 h-4" />
          </button>
        )}
        {/* Campaign button */}
        {onNavigateToCampaigns && (
          <button
            onClick={onNavigateToCampaigns}
            className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded"
            title={campaignTitle}
          >
            <Layers className="w-4 h-4" />
          </button>
        )}
        {/* Roll button */}
        {onRoll && (
          <button
            onClick={onRoll}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded"
            title={rollTitle}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        )}
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded"
            title={closeTitle}
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

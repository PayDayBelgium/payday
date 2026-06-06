import React from 'react';
import { useTranslation } from 'react-i18next';
import { Redo2, X as XIcon, Layers, ArrowDownLeft, Pencil } from 'lucide-react';

interface PositionActionButtonsProps {
  onRoll?: () => void;
  onClose?: () => void;
  onAssign?: () => void;
  onEdit?: () => void;
  onNavigateToCampaigns?: () => void;
  // Labels for tooltips
  rollTitle?: string;
  closeTitle?: string;
  assignTitle?: string;
  editTitle?: string;
  campaignTitle?: string;
}

export const PositionActionButtons: React.FC<PositionActionButtonsProps> = ({
  onRoll,
  onClose,
  onAssign,
  onEdit,
  onNavigateToCampaigns,
  rollTitle,
  closeTitle,
  assignTitle,
  editTitle,
  campaignTitle,
}) => {
  const { t } = useTranslation();
  const resolvedRollTitle = rollTitle ?? t('widgetsA.rollOption');
  const resolvedCloseTitle = closeTitle ?? t('widgetsA.closePosition');
  const resolvedAssignTitle = assignTitle ?? t('widgetsA.assignment');
  const resolvedEditTitle = editTitle ?? t('widgetsA.edit');
  const resolvedCampaignTitle = campaignTitle ?? t('widgetsA.viewCampaign');
  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        {/* Assignment button - leftmost */}
        {onAssign && (
          <button
            onClick={onAssign}
            className="p-1 hover:bg-surface-muted dark:hover:bg-purple-900/30 text-ink-600 dark:text-ink-300 rounded"
            title={resolvedAssignTitle}
          >
            <ArrowDownLeft className="w-4 h-4" />
          </button>
        )}
        {/* Campaign button */}
        {onNavigateToCampaigns && (
          <button
            onClick={onNavigateToCampaigns}
            className="p-1 hover:bg-caution-50 dark:hover:bg-yellow-900/30 text-caution-600 dark:text-caution-500 rounded"
            title={resolvedCampaignTitle}
          >
            <Layers className="w-4 h-4" />
          </button>
        )}
        {/* Edit button */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1 hover:bg-surface-subtle text-ink-600 dark:text-ink-300 rounded"
            title={resolvedEditTitle}
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {/* Roll button */}
        {onRoll && (
          <button
            onClick={onRoll}
            className="p-1 hover:bg-primary-50 dark:hover:bg-primary-900/25 text-primary-700 dark:text-primary-300 rounded"
            title={resolvedRollTitle}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        )}
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-negative-50 dark:hover:bg-negative-700/25 text-negative-600 dark:text-negative-500 rounded"
            title={resolvedCloseTitle}
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

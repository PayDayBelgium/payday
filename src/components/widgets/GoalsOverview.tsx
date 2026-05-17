import React, { useMemo, useEffect } from 'react';
import { Target, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectActiveGoals, updateGoalProgress } from '../../store/slices/journalSlice';
import { selectPortfolioSummaries } from '../../store/slices/portfoliosSlice';
import { formatNumber } from '../../utils/numberFormat';

export const GoalsOverview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const activeGoals = useAppSelector(selectActiveGoals);
  const summaries = useAppSelector(selectPortfolioSummaries);

  // Calculate total portfolio value
  const totalPortfolioValue = useMemo(() => {
    return summaries.reduce((sum, s) => sum + s.totalValue, 0);
  }, [summaries]);

  // Update goal progress in Redux when portfolio value changes
  useEffect(() => {
    activeGoals.forEach((goal) => {
      let newCurrentValue = goal.currentValue || 0;

      // Auto-calculate based on goal type
      if (goal.type === 'total-value' || goal.type === 'assets-under-management') {
        newCurrentValue = totalPortfolioValue;
      }

      // Only update if value has changed significantly (> $1)
      if (Math.abs((goal.currentValue || 0) - newCurrentValue) > 1) {
        dispatch(updateGoalProgress({
          id: goal.id,
          currentValue: newCurrentValue,
        }));
      }
    });
  }, [activeGoals, totalPortfolioValue, dispatch]);

  // Calculate current values for goals based on type
  const goalsWithCurrentValues = useMemo(() => {
    return activeGoals.map((goal) => {
      let currentValue = goal.currentValue || 0;

      // Auto-calculate based on goal type
      if (goal.type === 'total-value') {
        currentValue = totalPortfolioValue;
      } else if (goal.type === 'assets-under-management') {
        currentValue = totalPortfolioValue; // Same as total value for now
      }
      // For 'monthly-premium' and 'custom', use the stored currentValue

      return {
        ...goal,
        currentValue,
      };
    });
  }, [activeGoals, totalPortfolioValue]);

  // Show only top 3 active goals
  const displayGoals = goalsWithCurrentValues.slice(0, 3);

  if (activeGoals.length === 0) {
    return null;
  }

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'total-value':
        return t('journal.goalTypeTotalValue');
      case 'assets-under-management':
        return t('journal.goalTypeAUM');
      case 'monthly-premium':
        return t('journal.goalTypeMonthlyPremium');
      case 'custom':
        return t('journal.goalTypeCustom');
      default:
        return type;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getProgress = (goal: any) => {
    if (!goal.currentValue) return 0;
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  };

  const isOverdue = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-primary-700 dark:text-primary-300" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('dashboard.activeGoals')}
            </h2>
          </div>
          <button
            onClick={() => navigate('/journal')}
            className="text-sm text-primary-700 dark:text-primary-300 hover:underline font-medium"
          >
            {t('dashboard.viewAll')}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {displayGoals.map((goal) => {
          const progress = getProgress(goal);
          const overdue = isOverdue(goal.deadline);

          return (
            <div
              key={goal.id}
              className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors cursor-pointer"
              onClick={() => navigate('/journal')}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">
                      {getGoalTypeLabel(goal.type)}
                    </span>
                    {overdue && (
                      <span className="text-xs font-medium px-2 py-0.5 bg-negative-50 dark:bg-negative-700/25 text-negative-700 dark:text-negative-500 rounded">
                        {t('dashboard.overdue')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {goal.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('journal.progress')}
                  </span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {formatNumber(progress, 1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      progress >= 100
                        ? 'bg-positive-500'
                        : progress >= 75
                        ? 'bg-primary-500'
                        : progress >= 50
                        ? 'bg-caution-500'
                        : 'bg-caution-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {goal.currentValue ? formatCurrency(goal.currentValue) : formatCurrency(0)}
                      {' / '}
                      {formatCurrency(goal.targetValue)}
                    </span>
                  </div>
                  {goal.deadline && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className={`w-4 h-4 ${overdue ? 'text-negative-600' : 'text-gray-500 dark:text-gray-400'}`} />
                      <span className={`${overdue ? 'text-negative-600 dark:text-negative-500 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatDate(goal.deadline)}
                      </span>
                    </div>
                  )}
                </div>
                {progress >= 100 && (
                  <CheckCircle2 className="w-5 h-5 text-positive-600" />
                )}
              </div>
            </div>
          );
        })}

        {activeGoals.length > 3 && (
          <button
            onClick={() => navigate('/journal')}
            className="w-full py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            {t('dashboard.viewAllGoals', { count: activeGoals.length - 3 })}
          </button>
        )}
      </div>
    </div>
  );
};

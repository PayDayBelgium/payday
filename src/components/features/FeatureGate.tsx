import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mountain, Star, ArrowRight } from 'lucide-react';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { getLevelConfig } from '../../store/slices/userProgressSlice';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCredits } from '../../store/slices/userProgressSlice';
import type { FeatureId } from '../../types';

interface FeatureGateProps {
  feature: FeatureId;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to gate features based on user level
 * Shows a locked state when the user doesn't have access
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback }) => {
  const navigate = useNavigate();
  const { hasAccess, requiredLevel } = useFeatureAccess(feature);
  const credits = useAppSelector(selectCredits);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show default locked state
  const levelConfig = requiredLevel ? getLevelConfig(requiredLevel) : null;

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        {/* Lock icon with level color */}
        <div
          className={`
          w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center
          ${
            levelConfig?.slopeColor === 'green'
              ? 'bg-positive-50 dark:bg-positive-700/25'
              : levelConfig?.slopeColor === 'blue'
                ? 'bg-primary-50 dark:bg-primary-900/30'
                : levelConfig?.slopeColor === 'red'
                  ? 'bg-negative-50 dark:bg-negative-700/25'
                  : levelConfig?.slopeColor === 'orange'
                    ? 'bg-caution-50 dark:bg-caution-600/25'
                    : 'bg-gray-100 dark:bg-gray-700'
          }
        `}
        >
          <Lock
            className={`
            w-10 h-10
            ${
              levelConfig?.slopeColor === 'green'
                ? 'text-positive-600 dark:text-positive-500'
                : levelConfig?.slopeColor === 'blue'
                  ? 'text-primary-700 dark:text-primary-300'
                  : levelConfig?.slopeColor === 'red'
                    ? 'text-negative-600 dark:text-negative-500'
                    : levelConfig?.slopeColor === 'orange'
                      ? 'text-caution-600 dark:text-caution-500'
                      : 'text-gray-600 dark:text-gray-400'
            }
          `}
          />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Feature Vergrendeld
        </h2>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Deze functie is beschikbaar vanaf niveau{' '}
          <span className="font-semibold">{levelConfig?.name}</span> ({levelConfig?.slopeName}).
        </p>

        {/* Level card */}
        {levelConfig && (
          <div
            className={`
            p-4 rounded-lg mb-6
            ${
              levelConfig.slopeColor === 'green'
                ? 'bg-positive-50 dark:bg-positive-700/15 border border-positive-500/20 dark:border-positive-700'
                : levelConfig.slopeColor === 'blue'
                  ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700'
                  : levelConfig.slopeColor === 'red'
                    ? 'bg-negative-50 dark:bg-negative-700/15 border border-negative-500/20 dark:border-negative-700'
                    : levelConfig.slopeColor === 'orange'
                      ? 'bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-600'
                      : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
            }
          `}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">{levelConfig.icon}</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {levelConfig.slopeName}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {levelConfig.creditsRequired > 0 && (
                <>
                  <span className="font-medium">{levelConfig.creditsRequired} credits</span> nodig
                  {credits > 0 && <span className="text-gray-500"> (je hebt {credits})</span>}
                </>
              )}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/mission')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            <Mountain className="w-5 h-5" />
            Bekijk Je Progressie
            <ArrowRight className="w-4 h-4" />
          </button>

          {levelConfig?.priceEUR && levelConfig.priceEUR > 0 && (
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors text-gray-700 dark:text-gray-300">
              <Star className="w-5 h-5" />
              Direct Ontgrendelen voor €{levelConfig.priceEUR}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Higher-order component for gating features
 */
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: FeatureId
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate feature={feature}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}

/**
 * Simple component to show a locked indicator on menu items
 */
export const FeatureLockIndicator: React.FC<{ feature: FeatureId; className?: string }> = ({
  feature,
  className = '',
}) => {
  const { hasAccess } = useFeatureAccess(feature);

  if (hasAccess) {
    return null;
  }

  return <Lock className={`w-3 h-3 text-gray-400 ${className}`} />;
};

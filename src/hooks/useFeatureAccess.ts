import { useAppSelector } from './useAppSelector';
import { selectUnlockedLevels, isFeatureAvailable, LEVEL_CONFIGS } from '../store/slices/userProgressSlice';
import type { FeatureId, UserLevel } from '../types';

/**
 * Hook to check if a user has access to a specific feature
 */
export const useFeatureAccess = (feature: FeatureId): {
  hasAccess: boolean;
  requiredLevel: UserLevel | null;
  isLocked: boolean;
} => {
  const unlockedLevels = useAppSelector(selectUnlockedLevels);
  const hasAccess = isFeatureAvailable(feature, unlockedLevels);

  // Find which level this feature belongs to
  let requiredLevel: UserLevel | null = null;
  for (const config of LEVEL_CONFIGS) {
    if (config.features.includes(feature)) {
      requiredLevel = config.level;
      break;
    }
  }

  return {
    hasAccess,
    requiredLevel,
    isLocked: !hasAccess,
  };
};

/**
 * Hook to check if user has access to a level
 */
export const useLevelAccess = (level: UserLevel): boolean => {
  const unlockedLevels = useAppSelector(selectUnlockedLevels);
  return unlockedLevels.includes(level);
};

/**
 * Hook to get all features and their access status
 */
export const useAllFeatureAccess = (): Record<FeatureId, boolean> => {
  const unlockedLevels = useAppSelector(selectUnlockedLevels);

  const allFeatures: FeatureId[] = LEVEL_CONFIGS.flatMap(config => config.features);
  const accessMap: Record<string, boolean> = {};

  for (const feature of allFeatures) {
    accessMap[feature] = isFeatureAvailable(feature, unlockedLevels);
  }

  return accessMap as Record<FeatureId, boolean>;
};

/**
 * Map strategy routes to feature IDs
 */
export const STRATEGY_FEATURE_MAP: Record<string, FeatureId> = {
  'stocks-etfs': 'stocks',
  'leaps': 'leaps',
  'covered-calls': 'covered_calls',
  'csp': 'cash_secured_puts',
  'pmcc': 'pmcc',
  'spreads': 'spreads',
  'kaching': 'kaching',
};

/**
 * Hook to check if a strategy route is accessible
 */
export const useStrategyAccess = (strategyRoute: string): {
  hasAccess: boolean;
  requiredLevel: UserLevel | null;
  featureId: FeatureId | null;
} => {
  const featureId = STRATEGY_FEATURE_MAP[strategyRoute] || null;
  const unlockedLevels = useAppSelector(selectUnlockedLevels);

  if (!featureId) {
    return { hasAccess: true, requiredLevel: null, featureId: null };
  }

  const hasAccess = isFeatureAvailable(featureId, unlockedLevels);

  // Find required level
  let requiredLevel: UserLevel | null = null;
  for (const config of LEVEL_CONFIGS) {
    if (config.features.includes(featureId)) {
      requiredLevel = config.level;
      break;
    }
  }

  return { hasAccess, requiredLevel, featureId };
};

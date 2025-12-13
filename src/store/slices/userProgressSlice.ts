import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { UserLevel, UserProgress, Achievement, CreditTransaction, LevelConfig, FeatureId } from '../../types';

// Level configurations with ski slope analogy
export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 'beginner',
    name: 'Beginner',
    slopeName: 'Groene Piste',
    slopeColor: 'green',
    icon: '🟢',
    description: 'Start je beleggingsreis met aandelen, ETFs en dividenden. Leer de basisprincipes van portfoliobeheer.',
    features: ['broker_setup', 'stocks', 'etfs', 'dividends', 'portfolio_tracking', 'basic_analytics'],
    creditsRequired: 0,
    priceEUR: 0,
  },
  {
    level: 'medior',
    name: 'Medior',
    slopeName: 'Blauwe Piste',
    slopeColor: 'blue',
    icon: '🔵',
    description: 'Ontdek inkomensstrategieën met covered calls, cash secured puts en de Wheel strategie.',
    features: ['covered_calls', 'cash_secured_puts', 'wheel_strategy', 'options_basics', 'premium_tracking'],
    creditsRequired: 500,
    priceEUR: 29,
  },
  {
    level: 'senior',
    name: 'Senior',
    slopeName: 'Rode Piste',
    slopeColor: 'red',
    icon: '🔴',
    description: 'Beheers geavanceerde strategieën met LEAPS, delta management en PMCC.',
    features: ['leaps', 'delta_management', 'pmcc', 'advanced_analytics', 'roll_management'],
    creditsRequired: 1500,
    priceEUR: 49,
  },
  {
    level: 'expert',
    name: 'Expert',
    slopeName: 'Zwarte Piste',
    slopeColor: 'black',
    icon: '⚫',
    description: 'Toegang tot alle strategieën inclusief spreads, iron condors, KaChing en AI-assistent.',
    features: ['spreads', 'iron_condors', 'kaching', 'complex_strategies', 'paper_trading', 'ai_assistant'],
    creditsRequired: 3000,
    priceEUR: 99,
  },
];

// Get all features up to and including a level
export const getFeaturesForLevel = (level: UserLevel): FeatureId[] => {
  const levelOrder: UserLevel[] = ['beginner', 'medior', 'senior', 'expert'];
  const levelIndex = levelOrder.indexOf(level);

  return LEVEL_CONFIGS
    .filter((_, index) => index <= levelIndex)
    .flatMap(config => config.features);
};

// Check if a feature is available for a user
export const isFeatureAvailable = (feature: FeatureId, unlockedLevels: UserLevel[]): boolean => {
  for (const config of LEVEL_CONFIGS) {
    if (config.features.includes(feature) && unlockedLevels.includes(config.level)) {
      return true;
    }
  }
  return false;
};

// Get the level configuration
export const getLevelConfig = (level: UserLevel): LevelConfig => {
  return LEVEL_CONFIGS.find(config => config.level === level) || LEVEL_CONFIGS[0];
};

interface UserProgressState {
  progress: UserProgress;
  creditHistory: CreditTransaction[];
  isLoading: boolean;
}

const initialState: UserProgressState = {
  progress: {
    currentLevel: 'beginner',
    credits: 0,
    unlockedLevels: ['beginner'],
    completedLessons: [],
    achievements: [],
    paperTradingEnabled: true, // Start with paper trading by default
    joinedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  creditHistory: [],
  isLoading: false,
};

const userProgressSlice = createSlice({
  name: 'userProgress',
  initialState,
  reducers: {
    // Add credits to user account
    addCredits: (state, action: PayloadAction<{ amount: number; reason: string }>) => {
      const { amount, reason } = action.payload;
      state.progress.credits += amount;

      const transaction: CreditTransaction = {
        id: `credit-${Date.now()}`,
        type: 'earned',
        amount,
        reason,
        timestamp: new Date().toISOString(),
      };
      state.creditHistory.push(transaction);
      state.progress.lastActiveAt = new Date().toISOString();
    },

    // Spend credits (e.g., to unlock a level)
    spendCredits: (state, action: PayloadAction<{ amount: number; reason: string; levelId?: UserLevel }>) => {
      const { amount, reason, levelId } = action.payload;
      if (state.progress.credits >= amount) {
        state.progress.credits -= amount;

        const transaction: CreditTransaction = {
          id: `credit-${Date.now()}`,
          type: 'spent',
          amount: -amount,
          reason,
          timestamp: new Date().toISOString(),
          relatedLevelId: levelId,
        };
        state.creditHistory.push(transaction);
      }
    },

    // Purchase credits (from payment)
    purchaseCredits: (state, action: PayloadAction<{ amount: number }>) => {
      const { amount } = action.payload;
      state.progress.credits += amount;

      const transaction: CreditTransaction = {
        id: `credit-${Date.now()}`,
        type: 'purchased',
        amount,
        reason: 'Credits gekocht',
        timestamp: new Date().toISOString(),
      };
      state.creditHistory.push(transaction);
    },

    // Unlock a new level
    unlockLevel: (state, action: PayloadAction<UserLevel>) => {
      const level = action.payload;
      if (!state.progress.unlockedLevels.includes(level)) {
        state.progress.unlockedLevels.push(level);

        // Update current level if this is higher
        const levelOrder: UserLevel[] = ['beginner', 'medior', 'senior', 'expert'];
        const currentIndex = levelOrder.indexOf(state.progress.currentLevel);
        const newIndex = levelOrder.indexOf(level);

        if (newIndex > currentIndex) {
          state.progress.currentLevel = level;
        }
      }
    },

    // Set current active level (for users who want to practice at lower levels)
    setCurrentLevel: (state, action: PayloadAction<UserLevel>) => {
      const level = action.payload;
      if (state.progress.unlockedLevels.includes(level)) {
        state.progress.currentLevel = level;
      }
    },

    // Complete a lesson
    completeLesson: (state, action: PayloadAction<{ lessonId: string; creditsAwarded: number }>) => {
      const { lessonId, creditsAwarded } = action.payload;
      if (!state.progress.completedLessons.includes(lessonId)) {
        state.progress.completedLessons.push(lessonId);
        state.progress.credits += creditsAwarded;

        const transaction: CreditTransaction = {
          id: `credit-${Date.now()}`,
          type: 'earned',
          amount: creditsAwarded,
          reason: `Les voltooid: ${lessonId}`,
          timestamp: new Date().toISOString(),
        };
        state.creditHistory.push(transaction);
      }
    },

    // Add an achievement
    addAchievement: (state, action: PayloadAction<Achievement>) => {
      const achievement = action.payload;
      if (!state.progress.achievements.find(a => a.id === achievement.id)) {
        state.progress.achievements.push(achievement);
        state.progress.credits += achievement.creditsAwarded;

        const transaction: CreditTransaction = {
          id: `credit-${Date.now()}`,
          type: 'earned',
          amount: achievement.creditsAwarded,
          reason: `Achievement behaald: ${achievement.name}`,
          timestamp: new Date().toISOString(),
          relatedAchievementId: achievement.id,
        };
        state.creditHistory.push(transaction);
      }
    },

    // Toggle paper trading mode
    togglePaperTrading: (state) => {
      state.progress.paperTradingEnabled = !state.progress.paperTradingEnabled;
    },

    // Update last active timestamp
    updateLastActive: (state) => {
      state.progress.lastActiveAt = new Date().toISOString();
    },

    // Reset progress (for testing/development)
    resetProgress: (state) => {
      state.progress = initialState.progress;
      state.creditHistory = [];
    },
  },
});

export const {
  addCredits,
  spendCredits,
  purchaseCredits,
  unlockLevel,
  setCurrentLevel,
  completeLesson,
  addAchievement,
  togglePaperTrading,
  updateLastActive,
  resetProgress,
} = userProgressSlice.actions;

// Selectors
export const selectUserProgress = (state: RootState) => state.userProgress.progress;
export const selectCurrentLevel = (state: RootState) => state.userProgress.progress.currentLevel;
export const selectCredits = (state: RootState) => state.userProgress.progress.credits;
export const selectUnlockedLevels = (state: RootState) => state.userProgress.progress.unlockedLevels;
export const selectCreditHistory = (state: RootState) => state.userProgress.creditHistory;
export const selectPaperTradingEnabled = (state: RootState) => state.userProgress.progress.paperTradingEnabled;
export const selectCompletedLessons = (state: RootState) => state.userProgress.progress.completedLessons;
export const selectAchievements = (state: RootState) => state.userProgress.progress.achievements;

// Computed selectors
export const selectCanAccessLevel = (level: UserLevel) => (state: RootState) =>
  state.userProgress.progress.unlockedLevels.includes(level);

export const selectCanAccessFeature = (feature: FeatureId) => (state: RootState) =>
  isFeatureAvailable(feature, state.userProgress.progress.unlockedLevels);

export const selectCurrentLevelConfig = (state: RootState) =>
  getLevelConfig(state.userProgress.progress.currentLevel);

export const selectNextLevel = (state: RootState): LevelConfig | null => {
  const levelOrder: UserLevel[] = ['beginner', 'medior', 'senior', 'expert'];
  const currentIndex = levelOrder.indexOf(state.userProgress.progress.currentLevel);

  if (currentIndex < levelOrder.length - 1) {
    return getLevelConfig(levelOrder[currentIndex + 1]);
  }
  return null;
};

export default userProgressSlice.reducer;

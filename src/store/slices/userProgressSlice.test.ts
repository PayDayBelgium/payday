import { describe, it, expect } from 'vitest';
import reducer, {
  LEVEL_CONFIGS,
  getFeaturesForLevel,
  isFeatureAvailable,
  selectNextLevel,
  unlockLevel,
  activateModule,
  selectActivatedModules,
  selectIsModuleActivated,
} from './userProgressSlice';

describe('userProgressSlice levels', () => {
  it('has an offpiste level config with quant_trading', () => {
    const off = LEVEL_CONFIGS.find((c) => c.level === 'offpiste');
    expect(off).toBeTruthy();
    expect(off!.features).toContain('quant_trading');
    expect(off!.slopeColor).toBe('orange');
  });

  it('getFeaturesForLevel("offpiste") includes all lower features plus quant_trading', () => {
    const feats = getFeaturesForLevel('offpiste');
    expect(feats).toContain('quant_trading');
    expect(feats).toContain('stocks'); // beginner
    expect(feats).toContain('kaching'); // expert
  });

  it('quant_trading is only available when offpiste is unlocked', () => {
    expect(isFeatureAvailable('quant_trading', ['beginner', 'expert'])).toBe(false);
    expect(isFeatureAvailable('quant_trading', ['offpiste'])).toBe(true);
  });

  it('selectNextLevel from expert returns offpiste', () => {
    const root: any = { userProgress: { progress: { currentLevel: 'expert' } } };
    expect(selectNextLevel(root)?.level).toBe('offpiste');
  });

  it('selectNextLevel from offpiste returns null (top)', () => {
    const root: any = { userProgress: { progress: { currentLevel: 'offpiste' } } };
    expect(selectNextLevel(root)).toBeNull();
  });

  it('unlockLevel("offpiste") promotes currentLevel to offpiste', () => {
    const state: any = {
      progress: {
        currentLevel: 'expert',
        unlockedLevels: ['beginner', 'medior', 'senior', 'expert'],
      },
      creditHistory: [],
      isLoading: false,
    };
    const next = reducer(state, unlockLevel('offpiste'));
    expect(next.progress.unlockedLevels).toContain('offpiste');
    expect(next.progress.currentLevel).toBe('offpiste');
  });

  it('offpiste level requires 0 credits (unlockable for testing)', () => {
    const off = LEVEL_CONFIGS.find((c) => c.level === 'offpiste');
    expect(off!.creditsRequired).toBe(0);
  });
});

describe('userProgressSlice modules', () => {
  it('activateModule adds the module once (idempotent)', () => {
    const state: any = { progress: { activatedModules: [] }, creditHistory: [], isLoading: false };
    const once = reducer(state, activateModule('community'));
    expect(once.progress.activatedModules).toEqual(['community']);
    const twice = reducer(once, activateModule('community'));
    expect(twice.progress.activatedModules).toEqual(['community']);
  });

  it('activateModule initializes the array when missing (persisted older state)', () => {
    const state: any = { progress: {}, creditHistory: [], isLoading: false };
    const next = reducer(state, activateModule('mentorship'));
    expect(next.progress.activatedModules).toEqual(['mentorship']);
  });

  it('selectActivatedModules / selectIsModuleActivated read defensively', () => {
    const empty: any = { userProgress: { progress: {} } };
    expect(selectActivatedModules(empty)).toEqual([]);
    expect(selectIsModuleActivated('community')(empty)).toBe(false);
    const root: any = { userProgress: { progress: { activatedModules: ['mentorship'] } } };
    expect(selectIsModuleActivated('mentorship')(root)).toBe(true);
    expect(selectIsModuleActivated('community')(root)).toBe(false);
  });
});

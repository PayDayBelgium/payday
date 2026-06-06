import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  GraduationCap,
  TrendingUp,
  Shield,
  Zap,
  Award,
  ChevronRight,
  Check,
  Lock,
  Star,
  Play,
  CreditCard,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePageTitle } from '../../contexts/PageTitleContext';
import {
  selectUserProgress,
  selectCurrentLevelConfig,
  selectNextLevel,
  selectActivatedModules,
  LEVEL_CONFIGS,
  unlockLevel,
  spendCredits,
  activateModule,
} from '../../store/slices/userProgressSlice';
import { LearningResources } from '../../components/learning/LearningResources';
import { EducationCurriculum } from '../../components/learning/EducationCurriculum';
import {
  OnboardingWizard,
  resetWizardForLevel,
} from '../../components/onboarding/OnboardingWizard';
import { PaydayMountain } from '../../components/mission/PaydayMountain';
import { selectHasPendingRequest } from '../../store/slices/mentorshipSlice';
import type { UserLevel, LevelConfig, ModuleId } from '../../types';

// Level card component
const LevelCard: React.FC<{
  config: LevelConfig;
  isUnlocked: boolean;
  isCurrent: boolean;
  onUnlock: () => void;
  onRestartWizard: () => void;
  userCredits: number;
}> = ({ config, isUnlocked, isCurrent, onUnlock, onRestartWizard, userCredits }) => {
  const canAfford = userCredits >= config.creditsRequired;

  const getSlopeColorClasses = () => {
    switch (config.slopeColor) {
      case 'green':
        return 'border-positive-500 bg-positive-50 dark:bg-positive-700/15';
      case 'blue':
        return 'border-primary-500 bg-primary-50 dark:bg-primary-900/20';
      case 'red':
        return 'border-negative-500 bg-negative-50 dark:bg-negative-700/15';
      case 'black':
        return 'border-trading-dark-900 dark:border-surface-subtle bg-surface dark:bg-trading-dark-800';
      case 'orange':
        return 'border-caution-500 bg-caution-50 dark:bg-caution-600/15';
      default:
        return 'border-ink-200 bg-surface';
    }
  };

  const getHeaderColorClasses = () => {
    switch (config.slopeColor) {
      case 'green':
        return 'bg-positive-700';
      case 'blue':
        return 'bg-primary-700';
      case 'red':
        return 'bg-negative-700';
      case 'black':
        return 'bg-ink-900 dark:bg-ink-100';
      case 'orange':
        return 'bg-caution-500';
      default:
        return 'bg-ink-700';
    }
  };

  return (
    <div
      className={`
      relative rounded-xl border-2 overflow-hidden transition-all duration-300
      ${isUnlocked ? getSlopeColorClasses() : 'border-surface-line dark:border-trading-dark-600 bg-white dark:bg-trading-dark-800'}
      ${isCurrent ? 'ring-2 ring-offset-2 ring-primary-500' : ''}
    `}
    >
      {/* Header */}
      <div
        className={`
        px-4 py-3 flex items-center justify-between
        ${isUnlocked ? getHeaderColorClasses() : 'bg-surface-subtle dark:bg-trading-dark-700'}
      `}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h3
              className={`font-bold ${isUnlocked ? 'text-white dark:text-ink-900' : 'text-ink-600 dark:text-ink-300'}`}
            >
              {config.name}
            </h3>
            <p
              className={`text-xs ${isUnlocked ? 'text-white/80 dark:text-ink-900/70' : 'text-ink-500 dark:text-ink-400'}`}
            >
              {config.slopeName}
            </p>
          </div>
        </div>
        {isUnlocked ? (
          <div className="flex items-center gap-1 bg-white/20 dark:bg-black/20 px-2 py-1 rounded-full">
            <Check className="w-4 h-4 text-white dark:text-ink-900" />
            <span className="text-xs font-medium text-white dark:text-ink-900">Ontgrendeld</span>
          </div>
        ) : (
          <Lock className="w-5 h-5 text-ink-400" />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-ink-600 dark:text-ink-300 mb-4">{config.description}</p>

        {/* Features */}
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide">
            Features
          </h4>
          <div className="flex flex-wrap gap-1">
            {config.features.slice(0, 4).map((feature) => (
              <span
                key={feature}
                className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${
                    isUnlocked
                      ? 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-700 dark:text-ink-300'
                      : 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-400 dark:text-ink-500'
                  }
                `}
              >
                {feature.replace(/_/g, ' ')}
              </span>
            ))}
            {config.features.length > 4 && (
              <span className="text-xs text-ink-400 dark:text-ink-500">
                +{config.features.length - 4} meer
              </span>
            )}
          </div>
        </div>

        {/* Restart wizard button for unlocked levels */}
        {isUnlocked && (
          <div className="border-t border-surface-line dark:border-trading-dark-500 pt-4">
            <button
              onClick={onRestartWizard}
              className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Herstart introductie wizard
            </button>
          </div>
        )}

        {/* Unlock section */}
        {!isUnlocked && (
          <div className="border-t border-surface-line dark:border-trading-dark-500 pt-4 space-y-3">
            {config.creditsRequired > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500 dark:text-ink-400">Credits nodig:</span>
                <span
                  className={`font-bold ${canAfford ? 'text-positive-600' : 'text-ink-600 dark:text-ink-300'}`}
                >
                  {config.creditsRequired}
                </span>
              </div>
            )}

            {config.priceEUR && config.priceEUR > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500 dark:text-ink-400">Of direct kopen:</span>
                <span className="font-bold text-ink-600 dark:text-ink-300">€{config.priceEUR}</span>
              </div>
            )}

            <div className="flex gap-2">
              {canAfford && (
                <button
                  onClick={onUnlock}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <Star className="w-4 h-4" />
                  {config.creditsRequired === 0 ? 'Ontgrendel nu' : 'Ontgrendel met credits'}
                </button>
              )}
              {config.priceEUR && config.priceEUR > 0 && (
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-ink-200 dark:border-trading-dark-500 hover:bg-surface dark:hover:bg-trading-dark-700 rounded-lg font-medium text-sm transition-colors text-ink-700 dark:text-ink-300">
                  <CreditCard className="w-4 h-4" />
                  Kopen €{config.priceEUR}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Free modules (no level/credits) — activating them shows them in the sidebar.
const MODULE_CONFIGS: {
  id: ModuleId;
  name: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  {
    id: 'community',
    name: 'Community',
    description:
      'Deel trading ideas en ga in gesprek met andere PayDay-traders in de après-ski bar.',
    path: '/community',
    icon: MessageSquare,
  },
  {
    id: 'mentorship',
    name: 'Mentorship',
    description:
      'Vraag persoonlijke begeleiding aan via de ski-school. Opleiding op maat, los van credits.',
    path: '/mentorship',
    icon: GraduationCap,
  },
];

// Module card — activate for free (no credits), then visible in the sidebar.
const ModuleCard: React.FC<{
  config: (typeof MODULE_CONFIGS)[number];
  isActivated: boolean;
  onActivate: () => void;
  onOpen: () => void;
}> = ({ config, isActivated, onActivate, onOpen }) => {
  const Icon = config.icon;
  return (
    <div
      className={`
      relative rounded-xl border-2 overflow-hidden transition-all duration-300
      ${isActivated ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-surface-line dark:border-trading-dark-600 bg-white dark:bg-trading-dark-800'}
    `}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center flex-shrink-0">
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-bold text-ink-900 dark:text-white tracking-tight">{config.name}</h3>
            <p className="text-xs text-ink-500 dark:text-ink-400">Module</p>
          </div>
          {isActivated && (
            <span className="ml-auto flex items-center gap-1 bg-primary-700 text-white px-2 py-1 rounded-full text-xs font-medium">
              <Check className="w-3.5 h-3.5" /> Actief
            </span>
          )}
        </div>
        <p className="text-sm text-ink-600 dark:text-ink-300 mb-4">{config.description}</p>
        {isActivated ? (
          <button
            onClick={onOpen}
            className="flex items-center gap-2 text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline"
          >
            Openen <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onActivate}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Star className="w-4 h-4" /> Activeren
          </button>
        )}
      </div>
    </div>
  );
};

export const MissionStatement: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { pushNavigation } = useNavigation();
  const { setPageTitle } = usePageTitle();
  const progress = useAppSelector(selectUserProgress);
  const currentLevelConfig = useAppSelector(selectCurrentLevelConfig);
  const nextLevel = useAppSelector(selectNextLevel);
  const mentorshipRequested = useAppSelector(selectHasPendingRequest);
  const activatedModules = useAppSelector(selectActivatedModules);

  useEffect(() => {
    setPageTitle('Jouw Reis', 'Curriculum, niveaus en leertraject');
  }, [setPageTitle]);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardLevel, setWizardLevel] = useState<UserLevel>('beginner');

  const handleNavigate = (path: string, title: string) => {
    pushNavigation(path, title);
    navigate(path);
  };

  const handleUnlockLevel = (level: UserLevel) => {
    const config = LEVEL_CONFIGS.find((c) => c.level === level);
    if (config && progress.credits >= config.creditsRequired) {
      dispatch(
        spendCredits({
          amount: config.creditsRequired,
          reason: `Level ${config.name} ontgrendeld`,
          levelId: level,
        })
      );
      dispatch(unlockLevel(level));
    }
  };

  const handleRestartWizard = (level: UserLevel) => {
    resetWizardForLevel(level);
    setWizardLevel(level);
    setWizardOpen(true);
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
  };

  const handleWizardComplete = () => {
    setWizardOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Hero Section — editorial intro */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-white dark:bg-trading-dark-800">
        <div className="grid md:grid-cols-[1.1fr_1fr] gap-0">
          <div className="p-8 md:p-10">
            <p className="eyebrow mb-3">Jouw Reis · Curriculum</p>
            <h1 className="text-2xl md:text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-ink-900 dark:text-white mb-3">
              Van groene piste naar de zwarte top
            </h1>
            <p className="text-sm text-ink-500 dark:text-ink-300 leading-relaxed max-w-md mb-5">
              Net als een skischool begeleidt PayDay je stap voor stap. Beheers eerst de basis, klim
              daarna naar premium-inkomen, spreads en uiteindelijk mastery.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--line)] rounded-md bg-surface">
                <Award className="w-4 h-4 text-primary-700" strokeWidth={1.75} />
                <span className="text-xs">
                  <span className="text-ink-500">Niveau · </span>
                  <span className="font-semibold text-ink-900 dark:text-white">
                    {currentLevelConfig.name}
                  </span>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--line)] rounded-md bg-surface">
                <Star className="w-4 h-4 text-primary-700" strokeWidth={1.75} />
                <span className="text-xs tabular-nums">
                  <span className="font-semibold text-ink-900 dark:text-white text-sm">
                    {progress.credits}
                  </span>{' '}
                  <span className="text-ink-500">credits</span>
                </span>
              </div>
            </div>
          </div>
          {/* Right side — piste-progressie als editorial strip */}
          <div className="relative bg-sky-fade border-l border-[var(--line)] overflow-hidden p-8 md:p-10 flex flex-col justify-center">
            <p className="eyebrow mb-5">Het traject</p>
            <div className="relative">
              {/* Connecting dotted route */}
              <div className="absolute left-0 right-0 top-[14px] border-t border-dashed border-[var(--line)] z-0" />
              <ul className="relative z-10 grid grid-cols-5 gap-2">
                {[
                  {
                    level: 'beginner' as UserLevel,
                    label: 'Groen',
                    sub: 'Fundamenten',
                    color: '#0F9D58',
                    shape: 'circle' as const,
                  },
                  {
                    level: 'medior' as UserLevel,
                    label: 'Blauw',
                    sub: 'Premium-inkomen',
                    color: '#2F6CAE',
                    shape: 'square' as const,
                  },
                  {
                    level: 'senior' as UserLevel,
                    label: 'Rood',
                    sub: 'Spreads · PMCC',
                    color: '#D14343',
                    shape: 'diamond' as const,
                  },
                  {
                    level: 'expert' as UserLevel,
                    label: 'Zwart',
                    sub: 'Mastery',
                    color: '#0F1E36',
                    shape: 'double-diamond' as const,
                  },
                  {
                    level: 'offpiste' as UserLevel,
                    label: 'Off-piste',
                    sub: 'Quant trading',
                    color: '#F08C2E',
                    shape: 'double-diamond' as const,
                  },
                ].map((step) => {
                  const isUnlocked = progress.unlockedLevels.includes(step.level);
                  const isActive = progress.currentLevel === step.level;
                  const tone = isUnlocked ? step.color : '#B4BFCF';
                  return (
                    <li key={step.level} className="flex flex-col items-center text-center">
                      <div
                        className={`w-7 h-7 rounded-full bg-white flex items-center justify-center ring-1 transition-shadow ${
                          isActive ? 'ring-2 shadow-card' : 'ring-[var(--line)]'
                        }`}
                        style={isActive ? { boxShadow: `0 0 0 3px ${tone}22` } : undefined}
                      >
                        <svg width="14" height="14" viewBox="-12 -12 24 24" aria-hidden="true">
                          {step.shape === 'circle' && <circle cx="0" cy="0" r="6.5" fill={tone} />}
                          {step.shape === 'square' && (
                            <rect x="-6" y="-6" width="12" height="12" fill={tone} />
                          )}
                          {step.shape === 'diamond' && (
                            <rect
                              x="-5.5"
                              y="-5.5"
                              width="11"
                              height="11"
                              fill={tone}
                              transform="rotate(45)"
                            />
                          )}
                          {step.shape === 'double-diamond' && (
                            <>
                              <rect
                                x="-9.5"
                                y="-4"
                                width="7.5"
                                height="7.5"
                                fill={tone}
                                transform="rotate(45 -5.75 0)"
                              />
                              <rect
                                x="2"
                                y="-4"
                                width="7.5"
                                height="7.5"
                                fill={tone}
                                transform="rotate(45 5.75 0)"
                              />
                            </>
                          )}
                        </svg>
                      </div>
                      <p
                        className={`mt-2 text-[11px] font-semibold tracking-tight ${isUnlocked ? 'text-ink-900 dark:text-white' : 'text-ink-400'}`}
                      >
                        {step.label}
                      </p>
                      <p
                        className={`text-[10px] leading-tight mt-0.5 ${isUnlocked ? 'text-ink-500 dark:text-ink-400' : 'text-ink-300'}`}
                      >
                        {step.sub}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Mountain visualization (the centerpiece) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="eyebrow mb-1">Route</p>
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight">
              Jouw progressie op PayDay Mountain
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-500">
            <Target className="w-3.5 h-3.5" />
            <span>Live · Skilift in bedrijf</span>
          </div>
        </div>
        <PaydayMountain
          activeLevel={progress.currentLevel}
          unlockedLevels={progress.unlockedLevels}
          onOpenCommunity={() => handleNavigate('/community', 'Community')}
          onOpenQuant={() => handleNavigate('/quant', 'Quant trading')}
          onOpenMentorship={() => handleNavigate('/mentorship', 'Mentorship')}
          mentorshipRequested={mentorshipRequested}
        />
      </section>

      {/* Mission Statement */}
      <div className="surface-card p-8">
        <p className="eyebrow mb-2">Onze missie</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-4">
          Iedereen toegang tot de kracht van opties.
        </h2>
        <div className="max-w-3xl">
          <p className="text-[15px] text-ink-700 dark:text-ink-300 leading-relaxed">
            PayDay is opgericht met één duidelijke missie:{' '}
            <strong className="text-ink-900 dark:text-white font-semibold">
              iedereen toegang geven tot de kracht van opties trading
            </strong>
            , ongeacht ervaring of achtergrond. Wij geloven dat financiële educatie de sleutel is
            tot financiële vrijheid.
          </p>
          <p className="text-[15px] text-ink-700 dark:text-ink-300 leading-relaxed mt-4">
            Net zoals een skischool je stap voor stap leert skiën — van de eerste sneeuwploeg op de
            groene piste tot het carven op de zwarte — begeleiden wij je door de wereld van
            beleggen. Elke strategie wordt uitgelegd, elke tool helpt je groeien.
          </p>
        </div>

        {/* Core Values — restrained, monochrome */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px mt-8 bg-[var(--line)] rounded-md overflow-hidden">
          {[
            {
              icon: GraduationCap,
              t: 'Educatie eerst',
              d: 'Leer de theorie voordat je handelt. Begrip is de basis van succes.',
            },
            {
              icon: Shield,
              t: 'Veilig groeien',
              d: 'Paper trading modus om risico-vrij te oefenen.',
            },
            {
              icon: TrendingUp,
              t: 'Stap voor stap',
              d: 'Ontgrendel nieuwe strategieën naarmate je vordert.',
            },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-white dark:bg-trading-dark-800 p-5">
              <div className="w-9 h-9 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center mb-3">
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-sm text-ink-900 dark:text-white tracking-tight mb-1">
                {t}
              </h3>
              <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Level Cards */}
      <div>
        <p className="eyebrow mb-2">Curriculum</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-5">
          De niveaus
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LEVEL_CONFIGS.map((config) => (
            <LevelCard
              key={config.level}
              config={config}
              isUnlocked={progress.unlockedLevels.includes(config.level)}
              isCurrent={progress.currentLevel === config.level}
              onUnlock={() => handleUnlockLevel(config.level)}
              onRestartWizard={() => handleRestartWizard(config.level)}
              userCredits={progress.credits}
            />
          ))}
        </div>

        {/* Extra modules — activate to show them in the sidebar */}
        <h3 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight mt-8 mb-1">
          Extra modules
        </h3>
        <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">
          Activeer een module om die in je zijbalk te tonen. Geen credits nodig.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODULE_CONFIGS.map((mod) => (
            <ModuleCard
              key={mod.id}
              config={mod}
              isActivated={activatedModules.includes(mod.id)}
              onActivate={() => dispatch(activateModule(mod.id))}
              onOpen={() => handleNavigate(mod.path, mod.name)}
            />
          ))}
        </div>
      </div>

      {/* How to Earn Credits */}
      <div className="surface-card p-8">
        <p className="eyebrow mb-2">Voortgang</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-6">
          Zo verdien je credits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] rounded-md overflow-hidden">
          {[
            { icon: Play, t: 'Voltooi lessen', d: '10–50 credits per les' },
            { icon: Award, t: 'Behaal achievements', d: '25–100 credits per achievement' },
            { icon: Zap, t: 'Dagelijkse streak', d: '5 credits per dag' },
            { icon: CreditCard, t: 'Koop credits', d: 'Of ontgrendel direct met €' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-white dark:bg-trading-dark-800 p-5 text-center">
              <div className="w-10 h-10 mx-auto mb-3 bg-primary-50 text-primary-700 rounded-md flex items-center justify-center">
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-sm text-ink-900 dark:text-white tracking-tight mb-1">
                {t}
              </h3>
              <p className="text-xs text-ink-500 dark:text-ink-400">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Education Curriculum Section */}
      <div className="surface-card p-8">
        <p className="eyebrow mb-2">Leertraject</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-3">
          Gestructureerd onderwijs
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 mb-6 max-w-2xl leading-relaxed">
          Elke les bouwt voort op de vorige en is afgestemd op jouw niveau.
        </p>
        <EducationCurriculum />
      </div>

      {/* Learning Resources Section */}
      <div className="surface-card p-8">
        <p className="eyebrow mb-2">Bibliotheek</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-6">
          Tips, boeken &amp; tutorials
        </h2>
        <LearningResources showAllLevels />
      </div>

      {/* Belgian Fiscal Info Teaser */}
      <div className="surface-card overflow-hidden">
        <div className="grid md:grid-cols-[1fr_2fr] gap-0">
          <div className="bg-sky-fade border-r border-[var(--line)] p-8 flex flex-col justify-center">
            <div className="w-11 h-11 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <p className="eyebrow mb-1">Fiscaliteit</p>
            <h2 className="text-base font-semibold text-ink-900 tracking-tight">
              Belgische belasting
            </h2>
          </div>
          <div className="p-8">
            <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed mb-4">
              Als Belgische belegger heb je te maken met specifieke belastingregels. PayDay helpt je
              met het begrijpen van de fiscale impact van je trades — inclusief meerwaardebelasting,
              TOB en roerende voorheffing.
            </p>
            <button
              onClick={() => handleNavigate('/tools/capital-gains-tax', 'Meerwaardebelasting')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800 transition-colors"
            >
              Naar de belastingcalculator
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {nextLevel && !progress.unlockedLevels.includes(nextLevel.level) && (
        <div className="surface-card p-8 text-center">
          <p className="eyebrow mb-2">Volgende stap</p>
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-2">
            Klaar voor de volgende piste?
          </h2>
          <p className="text-sm text-ink-500 dark:text-ink-400 mb-5">
            Nog{' '}
            <span className="font-semibold text-ink-900 dark:text-white tabular-nums">
              {nextLevel.creditsRequired - progress.credits}
            </span>{' '}
            credits om de {nextLevel.slopeName} te ontgrendelen.
          </p>
          {nextLevel.priceEUR && nextLevel.priceEUR > 0 && (
            <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[var(--line)] hover:border-primary-300 hover:bg-primary-50 rounded-md font-semibold text-sm transition-colors text-ink-700">
              <CreditCard className="w-4 h-4" strokeWidth={1.75} />
              Ontgrendel voor €{nextLevel.priceEUR}
            </button>
          )}
        </div>
      )}

      {/* Onboarding Wizard */}
      <OnboardingWizard
        level={wizardLevel}
        isOpen={wizardOpen}
        onClose={handleWizardClose}
        onComplete={handleWizardComplete}
      />
    </div>
  );
};

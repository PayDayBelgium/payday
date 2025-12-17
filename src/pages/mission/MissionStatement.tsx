import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mountain,
  Target,
  Rocket,
  GraduationCap,
  TrendingUp,
  Shield,
  Zap,
  Award,
  ChevronRight,
  Check,
  Lock,
  Star,
  BookOpen,
  Play,
  CreditCard,
  Gift,
  RefreshCw,
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  selectUserProgress,
  selectCurrentLevelConfig,
  selectNextLevel,
  LEVEL_CONFIGS,
  unlockLevel,
  spendCredits,
} from '../../store/slices/userProgressSlice';
import { LearningResources } from '../../components/learning/LearningResources';
import { EducationCurriculum } from '../../components/learning/EducationCurriculum';
import { OnboardingWizard, resetWizardForLevel } from '../../components/onboarding/OnboardingWizard';
import type { UserLevel, LevelConfig } from '../../types';

// Ski slope visual component
const SkiSlope: React.FC<{ activeLevel: UserLevel; unlockedLevels: UserLevel[] }> = ({
  activeLevel,
  unlockedLevels,
}) => {
  const levels: { level: UserLevel; position: { top: string; left: string } }[] = [
    { level: 'beginner', position: { top: '75%', left: '15%' } },
    { level: 'medior', position: { top: '55%', left: '35%' } },
    { level: 'senior', position: { top: '35%', left: '60%' } },
    { level: 'expert', position: { top: '18%', left: '80%' } },
  ];

  const getSlopeColor = (level: UserLevel) => {
    switch (level) {
      case 'beginner': return 'bg-green-500';
      case 'medior': return 'bg-blue-500';
      case 'senior': return 'bg-red-500';
      case 'expert': return 'bg-gray-900 dark:bg-gray-100';
      default: return 'bg-gray-400';
    }
  };

  const getSlopeRingColor = (level: UserLevel) => {
    switch (level) {
      case 'beginner': return 'ring-green-500';
      case 'medior': return 'ring-blue-500';
      case 'senior': return 'ring-red-500';
      case 'expert': return 'ring-gray-900 dark:ring-gray-100';
      default: return 'ring-gray-400';
    }
  };

  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-blue-100 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-xl overflow-hidden">
      {/* Mountain silhouette */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <polygon
          points="0,100 50,20 100,100"
          className="fill-blue-200/50 dark:fill-gray-700/50"
        />
        <polygon
          points="20,100 70,30 100,100"
          className="fill-blue-300/30 dark:fill-gray-600/30"
        />
        {/* Snow cap */}
        <polygon
          points="45,20 50,20 55,25 45,25"
          className="fill-white"
        />
      </svg>

      {/* Ski path (dashed line connecting levels) */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path
          d="M 15 75 Q 25 65 35 55 Q 48 45 60 35 Q 70 26 80 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="2,2"
          className="text-gray-400 dark:text-gray-500"
        />
      </svg>

      {/* Level markers */}
      {levels.map(({ level, position }) => {
        const isUnlocked = unlockedLevels.includes(level);
        const isActive = activeLevel === level;
        const config = LEVEL_CONFIGS.find(c => c.level === level);

        return (
          <div
            key={level}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ top: position.top, left: position.left }}
          >
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${isUnlocked ? getSlopeColor(level) : 'bg-gray-300 dark:bg-gray-600'}
                ${isActive ? `ring-4 ${getSlopeRingColor(level)} ring-opacity-50` : ''}
                transition-all duration-300
                ${isUnlocked ? 'shadow-lg' : ''}
              `}
            >
              {isUnlocked ? (
                <span className="text-white dark:text-gray-900 text-lg">{config?.icon}</span>
              ) : (
                <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            <span className={`
              mt-1 text-xs font-medium
              ${isUnlocked ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}
            `}>
              {config?.slopeName}
            </span>
          </div>
        );
      })}

      {/* Decorative elements */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Mountain className="w-4 h-4" />
        <span>PayDay Mountain</span>
      </div>
    </div>
  );
};

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
      case 'green': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'blue': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'red': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'black': return 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getHeaderColorClasses = () => {
    switch (config.slopeColor) {
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-500';
      case 'red': return 'bg-red-500';
      case 'black': return 'bg-gray-900 dark:bg-gray-100';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`
      relative rounded-xl border-2 overflow-hidden transition-all duration-300
      ${isUnlocked ? getSlopeColorClasses() : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}
      ${isCurrent ? 'ring-2 ring-offset-2 ring-primary-500' : ''}
    `}>
      {/* Header */}
      <div className={`
        px-4 py-3 flex items-center justify-between
        ${isUnlocked ? getHeaderColorClasses() : 'bg-gray-100 dark:bg-gray-700'}
      `}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h3 className={`font-bold ${isUnlocked ? 'text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-300'}`}>
              {config.name}
            </h3>
            <p className={`text-xs ${isUnlocked ? 'text-white/80 dark:text-gray-900/70' : 'text-gray-500 dark:text-gray-400'}`}>
              {config.slopeName}
            </p>
          </div>
        </div>
        {isUnlocked ? (
          <div className="flex items-center gap-1 bg-white/20 dark:bg-black/20 px-2 py-1 rounded-full">
            <Check className="w-4 h-4 text-white dark:text-gray-900" />
            <span className="text-xs font-medium text-white dark:text-gray-900">Ontgrendeld</span>
          </div>
        ) : (
          <Lock className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {config.description}
        </p>

        {/* Features */}
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Features
          </h4>
          <div className="flex flex-wrap gap-1">
            {config.features.slice(0, 4).map((feature) => (
              <span
                key={feature}
                className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${isUnlocked
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }
                `}
              >
                {feature.replace(/_/g, ' ')}
              </span>
            ))}
            {config.features.length > 4 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                +{config.features.length - 4} meer
              </span>
            )}
          </div>
        </div>

        {/* Restart wizard button for unlocked levels */}
        {isUnlocked && (
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <button
              onClick={onRestartWizard}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Herstart introductie wizard
            </button>
          </div>
        )}

        {/* Unlock section */}
        {!isUnlocked && (
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-3">
            {config.creditsRequired > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Credits nodig:</span>
                <span className={`font-bold ${canAfford ? 'text-green-600' : 'text-gray-600 dark:text-gray-300'}`}>
                  {config.creditsRequired}
                </span>
              </div>
            )}

            {config.priceEUR && config.priceEUR > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Of direct kopen:</span>
                <span className="font-bold text-gray-600 dark:text-gray-300">
                  €{config.priceEUR}
                </span>
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
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors text-gray-700 dark:text-gray-300"
                >
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

export const MissionStatement: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { pushNavigation } = useNavigation();
  const progress = useAppSelector(selectUserProgress);
  const currentLevelConfig = useAppSelector(selectCurrentLevelConfig);
  const nextLevel = useAppSelector(selectNextLevel);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardLevel, setWizardLevel] = useState<UserLevel>('beginner');

  const handleNavigate = (path: string, title: string) => {
    pushNavigation(path, title);
    navigate(path);
  };

  const handleUnlockLevel = (level: UserLevel) => {
    const config = LEVEL_CONFIGS.find(c => c.level === level);
    if (config && progress.credits >= config.creditsRequired) {
      dispatch(spendCredits({ amount: config.creditsRequired, reason: `Level ${config.name} ontgrendeld`, levelId: level }));
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
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8 text-white">
        <div className="flex items-start gap-6">
          <div className="p-4 bg-white/10 rounded-xl">
            <Mountain className="w-12 h-12" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              Jouw Beleggingsreis Begint Hier
            </h1>
            <p className="text-lg text-white/80 mb-4">
              Net zoals bij skiën begin je op de groene piste en werk je je weg omhoog naar de zwarte piste.
              Elke stap brengt je dichter bij financiële vrijheid.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <Award className="w-5 h-5" />
                <span className="font-medium">Huidig niveau: {currentLevelConfig.name}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <Star className="w-5 h-5" />
                <span className="font-medium">{progress.credits} credits</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ski Slope Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 icon-text-primary" />
          Jouw Progressie op PayDay Mountain
        </h2>
        <SkiSlope activeLevel={progress.currentLevel} unlockedLevels={progress.unlockedLevels} />
      </div>

      {/* Mission Statement */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Rocket className="w-6 h-6 icon-text-primary" />
          Onze Missie
        </h2>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            PayDay is opgericht met één duidelijke missie: <strong>iedereen toegang geven tot de kracht van opties trading</strong>,
            ongeacht hun ervaring of achtergrond. Wij geloven dat financiële educatie de sleutel is tot financiële vrijheid.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
            Net zoals een skischool je stap voor stap leert skiën - van de eerste sneeuwploeg op de groene piste
            tot het carven op de zwarte piste - begeleiden wij je door de wereld van beleggen en opties.
            Elke strategie wordt uitgelegd, elke tool is ontworpen om je te helpen groeien.
          </p>
        </div>

        {/* Core Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <GraduationCap className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Educatie Eerst</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Leer de theorie voordat je handelt. Begrip is de basis van succes.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Veilig Groeien</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Paper trading modus om risico-vrij te oefenen.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Stap voor Stap</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ontgrendel nieuwe strategieën naarmate je vordert.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Level Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6 icon-text-primary" />
          De Vier Niveaus
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
      </div>

      {/* How to Earn Credits */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Gift className="w-6 h-6 icon-text-primary" />
          Hoe Verdien Je Credits?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Voltooi Lessen</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">10-50 credits per les</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Behaal Achievements</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">25-100 credits per achievement</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Dagelijkse Streak</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">5 credits per dag</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Koop Credits</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Of ontgrendel direct met €</p>
          </div>
        </div>
      </div>

      {/* Education Curriculum Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 icon-text-primary" />
          Leertraject
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Volg ons gestructureerde leertraject om stap voor stap een betere belegger te worden.
          Elke les bouwt voort op de vorige en is afgestemd op jouw niveau.
        </p>
        <EducationCurriculum />
      </div>

      {/* Learning Resources Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 icon-text-primary" />
          Tips, Boeken & Tutorials
        </h2>
        <LearningResources showAllLevels />
      </div>

      {/* Belgian Fiscal Info Teaser */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
            <Shield className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Belgische Fiscaliteit
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-3">
              Als Belgische belegger heb je te maken met specifieke belastingregels.
              PayDay helpt je met het begrijpen van de fiscale impact van je trades,
              inclusief meerwaardebelasting, TOB en roerende voorheffing.
            </p>
            <button
              onClick={() => handleNavigate('/tools/capital-gains-tax', 'Meerwaardebelasting')}
              className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-medium hover:underline"
            >
              Bekijk de belastingcalculator
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {nextLevel && !progress.unlockedLevels.includes(nextLevel.level) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Klaar voor de Volgende Stap?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Je hebt nog <strong>{nextLevel.creditsRequired - progress.credits}</strong> credits nodig
            om de {nextLevel.slopeName} te ontgrendelen.
          </p>
          {nextLevel.priceEUR && nextLevel.priceEUR > 0 && (
            <button
              className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors text-gray-700 dark:text-gray-300 mx-auto"
            >
              <CreditCard className="w-5 h-5" />
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

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
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePageTitle } from '../../contexts/PageTitleContext';
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

// ─────────────────────────────────────────────────────────────────
// PayDay Mountain — illustrated alpine scene with working ski-lift.
// Gondolas travel up the cable on a continuous loop, snow falls,
// and authentic piste-markers (green ●, blue ▪, red ◆, black ◆◆)
// mark each level on the route. Your current level pulses softly.
// ─────────────────────────────────────────────────────────────────
const SkiSlope: React.FC<{ activeLevel: UserLevel; unlockedLevels: UserLevel[] }> = ({
  activeLevel,
  unlockedLevels,
}) => {
  // Station positions along the cable path (used both for sign placement and the cable curve)
  // Path goes from valley (bottom-left) up to the summit (top-right).
  const stations: Array<{
    level: UserLevel;
    x: number; y: number;            // coordinates inside the 800×420 viewBox
    pisteColor: string;              // CSS color of the piste marker
    pisteShape: 'circle' | 'square' | 'diamond' | 'double-diamond';
    label: string;
    sub: string;
  }> = [
    { level: 'beginner', x: 130, y: 340, pisteColor: '#0F9D58', pisteShape: 'circle',         label: 'Groene piste', sub: 'Fundamenten' },
    { level: 'medior',   x: 320, y: 240, pisteColor: '#2F6CAE', pisteShape: 'square',         label: 'Blauwe piste', sub: 'Premium-inkomen' },
    { level: 'senior',   x: 510, y: 150, pisteColor: '#D14343', pisteShape: 'diamond',        label: 'Rode piste',   sub: 'Spreads & PMCC' },
    { level: 'expert',   x: 680, y: 110, pisteColor: '#0F1E36', pisteShape: 'double-diamond', label: 'Zwarte piste', sub: 'Mastery' },
  ];

  const SnowFlake: React.FC<{ index: number }> = ({ index }) => {
    const left = (index * 73) % 100;
    const size = (index % 3) + 1.5;
    const delay = (index * 0.6) % 8;
    const duration = 7 + (index % 4) * 1.5;
    return (
      <div
        className="absolute rounded-full bg-white pointer-events-none"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          left: `${left}%`,
          top: '-8px',
          opacity: 0.85,
          animation: `snow-fall ${duration}s linear ${delay}s infinite`,
          boxShadow: '0 0 4px rgba(255,255,255,0.6)',
        }}
      />
    );
  };

  const PisteMarker: React.FC<{ shape: typeof stations[number]['pisteShape']; color: string }> = ({ shape, color }) => {
    if (shape === 'circle') {
      return <circle cx="0" cy="0" r="6" fill={color} stroke="#fff" strokeWidth="1.5" />;
    }
    if (shape === 'square') {
      return <rect x="-5.5" y="-5.5" width="11" height="11" fill={color} stroke="#fff" strokeWidth="1.5" />;
    }
    if (shape === 'diamond') {
      return <rect x="-5" y="-5" width="10" height="10" fill={color} stroke="#fff" strokeWidth="1.5" transform="rotate(45)" />;
    }
    return (
      <g>
        <rect x="-9" y="-4" width="8" height="8" fill={color} stroke="#fff" strokeWidth="1.5" transform="rotate(45 -5 0)" />
        <rect x="1"  y="-4" width="8" height="8" fill={color} stroke="#fff" strokeWidth="1.5" transform="rotate(45 5 0)" />
      </g>
    );
  };

  // Cable path expressed once — used for the visible line AND the gondola motion.
  const CABLE_PATH = 'M 60 360 Q 220 220, 380 140 T 720 40';

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[var(--line)] bg-sky-fade">
      {/* Snow flakes (HTML overlay — covers the full container) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {Array.from({ length: 28 }).map((_, i) => <SnowFlake key={i} index={i} />)}
      </div>

      {/* The mountain scene — aspect-ratio container ensures no clipping at any width */}
      <svg
        viewBox="0 0 800 420"
        className="relative w-full block"
        style={{ aspectRatio: '800 / 420' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#E8F0FA" />
            <stop offset="100%" stopColor="#F4F7FB" />
          </linearGradient>
          <linearGradient id="far-range" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#B6CDEA" />
            <stop offset="100%" stopColor="#DCE7F5" />
          </linearGradient>
          <linearGradient id="mid-range" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#86AED9" />
            <stop offset="100%" stopColor="#B6CDEA" />
          </linearGradient>
          <linearGradient id="near-range" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#5188C2" />
            <stop offset="100%" stopColor="#86AED9" />
          </linearGradient>
          <linearGradient id="snow-cap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E8F0FA" />
          </linearGradient>
          <linearGradient id="shadow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="rgba(11,74,143,0.20)" />
            <stop offset="100%" stopColor="rgba(11,74,143,0)" />
          </linearGradient>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="800" height="420" fill="url(#sky)" />

        {/* Sun glow */}
        <circle cx="745" cy="55" r="38" fill="rgba(255, 231, 170, 0.5)" />
        <circle cx="745" cy="55" r="18" fill="rgba(255, 231, 170, 0.8)" />

        {/* Distant range */}
        <path
          d="M 0 230  L 90 170  L 160 200  L 240 130  L 330 175  L 420 110  L 510 170  L 600 130  L 700 180  L 800 150  L 800 280 L 0 280 Z"
          fill="url(#far-range)"
          opacity="0.7"
        />

        {/* Mid range with snow caps */}
        <path
          d="M 0 290  L 60 240  L 130 280  L 220 200  L 300 270  L 380 190  L 460 250  L 560 180  L 660 240  L 760 200  L 800 230  L 800 320 L 0 320 Z"
          fill="url(#mid-range)"
        />
        {/* Snow caps on mid range */}
        <path d="M 220 200 L 240 217 L 230 220 L 215 213 Z"  fill="url(#snow-cap)" />
        <path d="M 380 190 L 405 210 L 395 215 L 372 205 Z"  fill="url(#snow-cap)" />
        <path d="M 560 180 L 585 198 L 575 204 L 552 195 Z"  fill="url(#snow-cap)" />

        {/* Main mountain (front) — the route climbs this one */}
        <path
          d="M 0 420 L 0 360 L 90 320 L 180 280 L 260 230 L 340 180 L 420 130 L 500 90 L 570 50 L 640 30 L 720 50 L 800 90 L 800 420 Z"
          fill="url(#near-range)"
        />
        {/* Snowy summit + crown */}
        <path
          d="M 500 90 L 570 50 L 640 30 L 720 50 L 705 75 L 685 60 L 660 78 L 630 56 L 605 80 L 575 64 L 555 86 L 520 95 Z"
          fill="url(#snow-cap)"
        />
        {/* Side shadow on main mountain */}
        <path
          d="M 640 30 L 720 50 L 800 90 L 800 420 L 720 420 Z"
          fill="url(#shadow)"
        />

        {/* Snow patches / ski runs scribed down the face */}
        <path d="M 640 36 Q 600 110 540 170 Q 480 230 410 290 Q 340 350 270 410"
              fill="none" stroke="#FFFFFF" strokeWidth="22" strokeLinecap="round" opacity="0.55" />
        <path d="M 640 36 Q 600 110 540 170 Q 480 230 410 290 Q 340 350 270 410"
              fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" opacity="0.85" />

        {/* Pine trees at the base */}
        {[
          [40, 380], [75, 395], [110, 385], [155, 400], [200, 392],
          [50, 360], [88, 372], [128, 365], [175, 378],
          [250, 405], [285, 395]
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <polygon points="0,-18 -8,4 8,4" fill="#1F5594" />
            <polygon points="0,-10 -10,10 10,10" fill="#0B4A8F" />
            <rect x="-1.5" y="9" width="3" height="6" fill="#2A3B57" />
          </g>
        ))}

        {/* ─── Ski-lift cable ─── */}
        {/* Lift towers */}
        {[
          { x: 80,  yTop: 340, yBot: 420 },
          { x: 230, yTop: 220, yBot: 380 },
          { x: 380, yTop: 130, yBot: 310 },
          { x: 530, yTop: 75,  yBot: 240 },
          { x: 680, yTop: 35,  yBot: 170 },
        ].map((t, i) => (
          <g key={i}>
            <line x1={t.x} y1={t.yTop} x2={t.x} y2={t.yBot}
                  stroke="#2A3B57" strokeWidth="2.5" strokeLinecap="round" />
            {/* Top crossbar */}
            <line x1={t.x - 12} y1={t.yTop} x2={t.x + 12} y2={t.yTop}
                  stroke="#2A3B57" strokeWidth="2.5" strokeLinecap="round" />
            {/* Cable pulley */}
            <circle cx={t.x} cy={t.yTop} r="3" fill="#0F1E36" />
            {/* Base block */}
            <rect x={t.x - 5} y={t.yBot - 4} width="10" height="5" fill="#1A2B45" />
          </g>
        ))}

        {/* Cable shadow */}
        <path d={CABLE_PATH} fill="none" stroke="rgba(11,74,143,0.10)" strokeWidth="3" transform="translate(1 2)" />
        {/* Cable — quadratic curve following the towers */}
        <path id="cable-route" d={CABLE_PATH} fill="none" stroke="#1A2B45" strokeWidth="1.5" />

        {/* ─── Station markers (piste signs on the cable route) ─── */}
        {stations.map((s) => {
          const isUnlocked = unlockedLevels.includes(s.level);
          const isActive   = activeLevel === s.level;
          return (
            <g key={s.level} transform={`translate(${s.x} ${s.y})`}>
              {/* Pole */}
              <line x1="0" y1="0" x2="0" y2="36" stroke="#2A3B57" strokeWidth="1.5" />
              {/* Sign plate */}
              <g transform="translate(0 -2)">
                <rect x="-30" y="-26" width="60" height="22" rx="3"
                      fill={isUnlocked ? '#FFFFFF' : '#EDF2F8'}
                      stroke={isUnlocked ? s.pisteColor : '#B4BFCF'}
                      strokeWidth={isUnlocked ? 1.5 : 1}
                      filter="url(#soft-shadow)" />
                <rect x="-30" y="-26" width="60" height="22" rx="3"
                      fill={isUnlocked ? '#FFFFFF' : '#EDF2F8'}
                      stroke={isUnlocked ? s.pisteColor : '#B4BFCF'}
                      strokeWidth={isUnlocked ? 1.5 : 1} />
                <g transform="translate(-20 -15)" opacity={isUnlocked ? 1 : 0.45}>
                  <PisteMarker shape={s.pisteShape} color={s.pisteColor} />
                </g>
                <text x="8" y="-12" fontSize="9" fontWeight="600" textAnchor="middle" fill={isUnlocked ? '#0F1E36' : '#8A99B0'}
                      style={{ fontFamily: 'Inter Tight, sans-serif', letterSpacing: '-0.01em' }}>
                  {s.level === 'beginner' ? 'GROEN'
                    : s.level === 'medior' ? 'BLAUW'
                    : s.level === 'senior' ? 'ROOD'
                    : 'ZWART'}
                </text>
              </g>
              {/* Caption under the pole — white backdrop keeps text readable
                  over snow, slopes and trees at any zoom level. */}
              <g transform="translate(0 50)">
                <rect x="-58" y="-9" width="116" height="28" rx="4"
                      fill="rgba(255,255,255,0.92)" stroke="rgba(11,30,54,0.08)" strokeWidth="0.6" />
                <text textAnchor="middle" y="2" fontSize="10" fontWeight="600" fill="#0F1E36"
                      style={{ fontFamily: 'Inter Tight, sans-serif' }}>
                  {s.label}
                </text>
                <text textAnchor="middle" y="14" fontSize="9" fill="#5A6B82"
                      style={{ fontFamily: 'Inter Tight, sans-serif' }}>
                  {isUnlocked ? s.sub : '— vergrendeld —'}
                </text>
              </g>
              {/* Active pulse */}
              {isActive && (
                <>
                  <circle cx="0" cy="36" r="6" fill={s.pisteColor} opacity="0.35">
                    <animate attributeName="r" values="6;16;6" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="0" cy="36" r="4" fill={s.pisteColor} />
                </>
              )}
              {/* Lock badge if not unlocked */}
              {!isUnlocked && (
                <g transform="translate(0 36)">
                  <circle r="6" fill="#FFFFFF" stroke="#B4BFCF" strokeWidth="1.2" />
                  <path d="M -2 -1 L -2 -3 Q -2 -4.5 0 -4.5 Q 2 -4.5 2 -3 L 2 -1 M -2.5 -1 L 2.5 -1 L 2.5 2.5 L -2.5 2.5 Z"
                        fill="none" stroke="#5A6B82" strokeWidth="0.9" strokeLinecap="round" />
                </g>
              )}
            </g>
          );
        })}

        {/* Gondolas — rendered inside the SVG so they always stay on the cable, regardless of container width.
            Each gondola's origin (0,0) follows the cable; the hanger drops down and the body hangs below. */}
        {[0, -6, -12].map((delay, i) => (
          <g key={i}>
            {/* Hanger drops 5 units below the cable, gondola body hangs from there */}
            <line x1="0" y1="0" x2="0" y2="5" stroke="#1A2B45" strokeWidth="0.8" />
            <rect x="-7" y="5" width="14" height="9" rx="2" fill="#FFFFFF" stroke="#1A2B45" strokeWidth="0.8" />
            <rect x="-5" y="7.5" width="10" height="4" rx="1" fill="#0B4A8F" opacity="0.85" />
            {/* Drop shadow */}
            <ellipse cx="0" cy="14.5" rx="6" ry="0.8" fill="rgba(11,74,143,0.18)" />
            <animateMotion
              dur="22s"
              repeatCount="indefinite"
              begin={`${delay}s`}
            >
              <mpath href="#cable-route" />
            </animateMotion>
          </g>
        ))}

        {/* Caption strip — placed inside SVG so it scales nicely too */}
        <g>
          {/* Legend (right) */}
          <g transform="translate(540 400)" style={{ fontFamily: 'Inter, sans-serif' }}>
            <circle cx="0"  cy="0" r="3.5" fill="#0F9D58" />
            <text   x="8"  y="3" fontSize="9.5" fill="#5A6B82" letterSpacing="0.06em">GROEN</text>
            <rect   x="55" y="-3.5" width="7" height="7" fill="#2F6CAE" />
            <text   x="66" y="3" fontSize="9.5" fill="#5A6B82" letterSpacing="0.06em">BLAUW</text>
            <rect   x="115" y="-3.5" width="7" height="7" fill="#D14343" transform="rotate(45 118.5 0)" />
            <text   x="128" y="3" fontSize="9.5" fill="#5A6B82" letterSpacing="0.06em">ROOD</text>
            <rect   x="175" y="-3.5" width="7" height="7" fill="#0F1E36" transform="rotate(45 178.5 0)" />
            <text   x="188" y="3" fontSize="9.5" fill="#5A6B82" letterSpacing="0.06em">ZWART</text>
          </g>
        </g>
      </svg>
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
      case 'green': return 'border-positive-500 bg-positive-50 dark:bg-positive-700/15';
      case 'blue': return 'border-primary-500 bg-primary-50 dark:bg-primary-900/20';
      case 'red': return 'border-negative-500 bg-negative-50 dark:bg-negative-700/15';
      case 'black': return 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800';
      case 'orange': return 'border-caution-500 bg-caution-50 dark:bg-caution-600/15';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getHeaderColorClasses = () => {
    switch (config.slopeColor) {
      case 'green': return 'bg-positive-700';
      case 'blue': return 'bg-primary-700';
      case 'red': return 'bg-negative-700';
      case 'black': return 'bg-ink-900 dark:bg-ink-100';
      case 'orange': return 'bg-caution-500';
      default: return 'bg-ink-700';
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
                <span className={`font-bold ${canAfford ? 'text-positive-600' : 'text-gray-600 dark:text-gray-300'}`}>
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
  const { setPageTitle } = usePageTitle();
  const progress = useAppSelector(selectUserProgress);
  const currentLevelConfig = useAppSelector(selectCurrentLevelConfig);
  const nextLevel = useAppSelector(selectNextLevel);

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
      {/* Hero Section — editorial intro */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-white dark:bg-trading-dark-800">
        <div className="grid md:grid-cols-[1.1fr_1fr] gap-0">
          <div className="p-8 md:p-10">
            <p className="eyebrow mb-3">Jouw Reis · Curriculum</p>
            <h1 className="text-2xl md:text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-ink-900 dark:text-white mb-3">
              Van groene piste naar de zwarte top
            </h1>
            <p className="text-sm text-ink-500 dark:text-ink-300 leading-relaxed max-w-md mb-5">
              Net als een skischool begeleidt PayDay je stap voor stap. Beheers eerst de basis,
              klim daarna naar premium-inkomen, spreads en uiteindelijk mastery.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--line)] rounded-md bg-surface">
                <Award className="w-4 h-4 text-primary-700" strokeWidth={1.75} />
                <span className="text-xs"><span className="text-ink-500">Niveau · </span><span className="font-semibold text-ink-900 dark:text-white">{currentLevelConfig.name}</span></span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--line)] rounded-md bg-surface">
                <Star className="w-4 h-4 text-primary-700" strokeWidth={1.75} />
                <span className="text-xs tabular-nums"><span className="font-semibold text-ink-900 dark:text-white text-sm">{progress.credits}</span> <span className="text-ink-500">credits</span></span>
              </div>
            </div>
          </div>
          {/* Right side — piste-progressie als editorial strip */}
          <div className="relative bg-sky-fade border-l border-[var(--line)] overflow-hidden p-8 md:p-10 flex flex-col justify-center">
            <p className="eyebrow mb-5">Het traject</p>
            <div className="relative">
              {/* Connecting dotted route */}
              <div className="absolute left-0 right-0 top-[14px] border-t border-dashed border-[var(--line)] z-0" />
              <ul className="relative z-10 grid grid-cols-4 gap-2">
                {([
                  { level: 'beginner' as UserLevel, label: 'Groen',  sub: 'Fundamenten',     color: '#0F9D58', shape: 'circle'         as const },
                  { level: 'medior'   as UserLevel, label: 'Blauw',  sub: 'Premium-inkomen', color: '#2F6CAE', shape: 'square'         as const },
                  { level: 'senior'   as UserLevel, label: 'Rood',   sub: 'Spreads · PMCC',  color: '#D14343', shape: 'diamond'        as const },
                  { level: 'expert'   as UserLevel, label: 'Zwart',  sub: 'Mastery',         color: '#0F1E36', shape: 'double-diamond' as const },
                ]).map((step) => {
                  const isUnlocked = progress.unlockedLevels.includes(step.level);
                  const isActive   = progress.currentLevel === step.level;
                  const tone       = isUnlocked ? step.color : '#B4BFCF';
                  return (
                    <li key={step.level} className="flex flex-col items-center text-center">
                      <div
                        className={`w-7 h-7 rounded-full bg-white flex items-center justify-center ring-1 transition-shadow ${
                          isActive
                            ? 'ring-2 shadow-card'
                            : 'ring-[var(--line)]'
                        }`}
                        style={isActive ? { boxShadow: `0 0 0 3px ${tone}22` } : undefined}
                      >
                        <svg width="14" height="14" viewBox="-12 -12 24 24" aria-hidden="true">
                          {step.shape === 'circle'         && <circle cx="0" cy="0" r="6.5" fill={tone} />}
                          {step.shape === 'square'         && <rect x="-6" y="-6" width="12" height="12" fill={tone} />}
                          {step.shape === 'diamond'        && <rect x="-5.5" y="-5.5" width="11" height="11" fill={tone} transform="rotate(45)" />}
                          {step.shape === 'double-diamond' && (
                            <>
                              <rect x="-9.5" y="-4" width="7.5" height="7.5" fill={tone} transform="rotate(45 -5.75 0)" />
                              <rect x="2"    y="-4" width="7.5" height="7.5" fill={tone} transform="rotate(45 5.75 0)" />
                            </>
                          )}
                        </svg>
                      </div>
                      <p className={`mt-2 text-[11px] font-semibold tracking-tight ${isUnlocked ? 'text-ink-900 dark:text-white' : 'text-ink-400'}`}>
                        {step.label}
                      </p>
                      <p className={`text-[10px] leading-tight mt-0.5 ${isUnlocked ? 'text-ink-500 dark:text-ink-400' : 'text-ink-300'}`}>
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
        <SkiSlope activeLevel={progress.currentLevel} unlockedLevels={progress.unlockedLevels} />
      </section>

      {/* Mission Statement */}
      <div className="surface-card p-8">
        <p className="eyebrow mb-2">Onze missie</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-4">
          Iedereen toegang tot de kracht van opties.
        </h2>
        <div className="max-w-3xl">
          <p className="text-[15px] text-ink-700 dark:text-ink-300 leading-relaxed">
            PayDay is opgericht met één duidelijke missie: <strong className="text-ink-900 dark:text-white font-semibold">iedereen toegang geven tot de kracht van opties trading</strong>,
            ongeacht ervaring of achtergrond. Wij geloven dat financiële educatie de sleutel is tot financiële vrijheid.
          </p>
          <p className="text-[15px] text-ink-700 dark:text-ink-300 leading-relaxed mt-4">
            Net zoals een skischool je stap voor stap leert skiën — van de eerste sneeuwploeg op de groene piste
            tot het carven op de zwarte — begeleiden wij je door de wereld van beleggen.
            Elke strategie wordt uitgelegd, elke tool helpt je groeien.
          </p>
        </div>

        {/* Core Values — restrained, monochrome */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px mt-8 bg-[var(--line)] rounded-md overflow-hidden">
          {[
            { icon: GraduationCap, t: 'Educatie eerst', d: 'Leer de theorie voordat je handelt. Begrip is de basis van succes.' },
            { icon: Shield,        t: 'Veilig groeien', d: 'Paper trading modus om risico-vrij te oefenen.' },
            { icon: TrendingUp,    t: 'Stap voor stap', d: 'Ontgrendel nieuwe strategieën naarmate je vordert.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-white dark:bg-trading-dark-800 p-5">
              <div className="w-9 h-9 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center mb-3">
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-sm text-ink-900 dark:text-white tracking-tight mb-1">{t}</h3>
              <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Level Cards */}
      <div>
        <p className="eyebrow mb-2">Curriculum</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-5">
          De vier niveaus
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
      <div className="surface-card p-8">
        <p className="eyebrow mb-2">Voortgang</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-6">
          Zo verdien je credits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] rounded-md overflow-hidden">
          {[
            { icon: Play,       t: 'Voltooi lessen',         d: '10–50 credits per les' },
            { icon: Award,      t: 'Behaal achievements',    d: '25–100 credits per achievement' },
            { icon: Zap,        t: 'Dagelijkse streak',      d: '5 credits per dag' },
            { icon: CreditCard, t: 'Koop credits',           d: 'Of ontgrendel direct met €' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-white dark:bg-trading-dark-800 p-5 text-center">
              <div className="w-10 h-10 mx-auto mb-3 bg-primary-50 text-primary-700 rounded-md flex items-center justify-center">
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-sm text-ink-900 dark:text-white tracking-tight mb-1">{t}</h3>
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
              Als Belgische belegger heb je te maken met specifieke belastingregels.
              PayDay helpt je met het begrijpen van de fiscale impact van je trades —
              inclusief meerwaardebelasting, TOB en roerende voorheffing.
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
            Nog <span className="font-semibold text-ink-900 dark:text-white tabular-nums">{nextLevel.creditsRequired - progress.credits}</span> credits
            om de {nextLevel.slopeName} te ontgrendelen.
          </p>
          {nextLevel.priceEUR && nextLevel.priceEUR > 0 && (
            <button
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[var(--line)] hover:border-primary-300 hover:bg-primary-50 rounded-md font-semibold text-sm transition-colors text-ink-700"
            >
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

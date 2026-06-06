import React, { useState } from 'react';
import {
  Lightbulb,
  BookOpen,
  PlayCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Star,
  Lock,
  Gift,
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  selectUnlockedLevels,
  selectCurrentLevel,
  LEVEL_CONFIGS,
} from '../../store/slices/userProgressSlice';
import { LEVEL_RESOURCES, getTipsUpToLevel } from '../../config/learningResources';
import type {
  UserLevel,
  TradingTip,
  RecommendedBook,
  VideoTutorial,
  ExternalResource,
} from '../../types';

// Tip Card Component
const TipCard: React.FC<{ tip: TradingTip; isLocked?: boolean }> = ({ tip, isLocked }) => {
  const getCategoryColor = (category: TradingTip['category']) => {
    switch (category) {
      case 'strategy':
        return 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300';
      case 'risk':
        return 'bg-negative-50 text-negative-700 dark:bg-negative-700/25 dark:text-negative-500';
      case 'psychology':
        return 'bg-surface-muted text-ink-700 dark:bg-trading-dark-600 dark:text-ink-300';
      case 'tax':
        return 'bg-caution-50 text-caution-600 dark:bg-caution-600/25 dark:text-caution-500';
      case 'tool':
        return 'bg-positive-50 text-positive-700 dark:bg-positive-700/25 dark:text-positive-500';
      default:
        return 'bg-surface-subtle text-ink-700 dark:bg-trading-dark-700 dark:text-ink-300';
    }
  };

  const getCategoryLabel = (category: TradingTip['category']) => {
    switch (category) {
      case 'strategy':
        return 'Strategie';
      case 'risk':
        return 'Risico';
      case 'psychology':
        return 'Psychologie';
      case 'tax':
        return 'Belasting';
      case 'tool':
        return 'Tool';
      default:
        return 'Algemeen';
    }
  };

  return (
    <div
      className={`
      relative p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600
      ${isLocked ? 'opacity-60' : 'hover:shadow-md'} transition-shadow
    `}
    >
      {isLocked && (
        <div className="absolute top-2 right-2">
          <Lock className="w-4 h-4 text-ink-400" />
        </div>
      )}
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{tip.icon || '💡'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-ink-900 dark:text-white text-sm">{tip.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(tip.category)}`}>
              {getCategoryLabel(tip.category)}
            </span>
          </div>
          <p
            className={`text-sm ${isLocked ? 'blur-sm select-none' : ''} text-ink-600 dark:text-ink-400`}
          >
            {tip.content}
          </p>
        </div>
      </div>
    </div>
  );
};

// Book Card Component
const BookCard: React.FC<{ book: RecommendedBook; isLocked?: boolean }> = ({ book, isLocked }) => {
  const getDifficultyColor = (difficulty: RecommendedBook['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'text-positive-600 dark:text-positive-500';
      case 'medium':
        return 'text-caution-600 dark:text-caution-500';
      case 'advanced':
        return 'text-negative-600 dark:text-negative-500';
      default:
        return 'text-ink-600';
    }
  };

  const getDifficultyLabel = (difficulty: RecommendedBook['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'Toegankelijk';
      case 'medium':
        return 'Gemiddeld';
      case 'advanced':
        return 'Gevorderd';
      default:
        return difficulty;
    }
  };

  return (
    <div
      className={`
      relative p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600
      ${isLocked ? 'opacity-60' : 'hover:shadow-md'} transition-shadow
    `}
    >
      {isLocked && (
        <div className="absolute top-2 right-2">
          <Lock className="w-4 h-4 text-ink-400" />
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="w-12 h-16 bg-gradient-to-br from-surface-subtle to-surface-muted dark:from-trading-dark-600 dark:to-trading-dark-600 rounded flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-6 h-6 text-ink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-ink-900 dark:text-white text-sm mb-1">{book.title}</h4>
          <p className="text-xs text-ink-500 dark:text-ink-400 mb-2">door {book.author}</p>
          <p
            className={`text-sm ${isLocked ? 'blur-sm select-none' : ''} text-ink-600 dark:text-ink-400 mb-3 line-clamp-2`}
          >
            {book.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {book.rating && (
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < book.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-ink-300'}`}
                    />
                  ))}
                </div>
              )}
              <span className={`text-xs ${getDifficultyColor(book.difficulty)}`}>
                {getDifficultyLabel(book.difficulty)}
              </span>
            </div>
            {!isLocked && (book.amazonUrl || book.bolUrl) && (
              <div className="flex gap-2">
                {book.bolUrl && (
                  <a
                    href={book.bolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-700 dark:text-primary-300 hover:underline flex items-center gap-1"
                  >
                    Bol.com <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {book.amazonUrl && (
                  <a
                    href={book.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-caution-600 dark:text-caution-500 hover:underline flex items-center gap-1"
                  >
                    Amazon <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Video Card Component
const VideoCard: React.FC<{ video: VideoTutorial; isLocked?: boolean }> = ({ video, isLocked }) => {
  return (
    <div
      className={`
      relative p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600
      ${isLocked ? 'opacity-60' : 'hover:shadow-md cursor-pointer'} transition-shadow
    `}
    >
      {isLocked && (
        <div className="absolute top-2 right-2">
          <Lock className="w-4 h-4 text-ink-400" />
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-negative-50 dark:bg-negative-700/25 rounded-lg flex items-center justify-center flex-shrink-0">
          <PlayCircle className="w-5 h-5 text-negative-600 dark:text-negative-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-ink-900 dark:text-white text-sm mb-1">{video.title}</h4>
          <p
            className={`text-xs ${isLocked ? 'blur-sm select-none' : ''} text-ink-600 dark:text-ink-400 mb-2 line-clamp-2`}
          >
            {video.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-500 dark:text-ink-400">{video.duration}</span>
            {video.creditsAwarded && (
              <span className="text-xs text-positive-600 dark:text-positive-500 flex items-center gap-1">
                <Gift className="w-3 h-3" />+{video.creditsAwarded} credits
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Resource Link Component
const ResourceLink: React.FC<{ resource: ExternalResource; isLocked?: boolean }> = ({
  resource,
  isLocked,
}) => {
  const getTypeIcon = (type: ExternalResource['type']) => {
    switch (type) {
      case 'broker':
        return '🏦';
      case 'tool':
        return '🔧';
      case 'calculator':
        return '🧮';
      case 'community':
        return '👥';
      default:
        return '🌐';
    }
  };

  return (
    <a
      href={isLocked ? undefined : resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        flex items-center gap-3 p-3 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600
        ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600'}
        transition-all
      `}
    >
      <span className="text-xl">{getTypeIcon(resource.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-ink-900 dark:text-white text-sm">{resource.title}</h4>
          {resource.isFree && (
            <span className="text-xs px-1.5 py-0.5 bg-positive-50 text-positive-700 dark:bg-positive-700/25 dark:text-positive-500 rounded">
              Gratis
            </span>
          )}
        </div>
        <p className="text-xs text-ink-500 dark:text-ink-400 truncate">{resource.description}</p>
      </div>
      {isLocked ? (
        <Lock className="w-4 h-4 text-ink-400 flex-shrink-0" />
      ) : (
        <ExternalLink className="w-4 h-4 text-ink-400 flex-shrink-0" />
      )}
    </a>
  );
};

// Section Component with collapsible content
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = true, count }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-surface dark:bg-trading-dark-900/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-subtle dark:hover:bg-trading-dark-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-ink-900 dark:text-white">{title}</span>
          {count !== undefined && (
            <span className="text-xs px-2 py-0.5 bg-surface-muted dark:bg-trading-dark-700 text-ink-600 dark:text-ink-400 rounded-full">
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-ink-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-ink-400" />
        )}
      </button>
      {isOpen && <div className="p-4 pt-0">{children}</div>}
    </div>
  );
};

// Main Learning Resources Component
interface LearningResourcesProps {
  showAllLevels?: boolean; // Show resources from all levels (locked ones will be blurred)
}

export const LearningResources: React.FC<LearningResourcesProps> = () => {
  const unlockedLevels = useAppSelector(selectUnlockedLevels);
  const currentLevel = useAppSelector(selectCurrentLevel);
  const [activeLevel, setActiveLevel] = useState<UserLevel | 'all'>(currentLevel);

  const levelOrder: UserLevel[] = ['beginner', 'medior', 'senior', 'expert'];

  // Get resources based on view mode
  const getResources = () => {
    if (activeLevel === 'all') {
      // Show all levels, marking locked ones
      return levelOrder.map((level) => ({
        level,
        resources: LEVEL_RESOURCES[level],
        isLocked: !unlockedLevels.includes(level),
      }));
    } else {
      // Show single level
      return [
        {
          level: activeLevel,
          resources: LEVEL_RESOURCES[activeLevel],
          isLocked: !unlockedLevels.includes(activeLevel),
        },
      ];
    }
  };

  const resourceGroups = getResources();

  return (
    <div className="space-y-6">
      {/* Level Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveLevel('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeLevel === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-700 dark:text-ink-300 hover:bg-surface-muted dark:hover:bg-trading-dark-600'
          }`}
        >
          Alle Niveaus
        </button>
        {levelOrder.map((level) => {
          const config = LEVEL_CONFIGS.find((c) => c.level === level);
          const isLocked = !unlockedLevels.includes(level);

          return (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeLevel === level
                  ? 'bg-primary-600 text-white'
                  : isLocked
                    ? 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-400 dark:text-ink-500'
                    : 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-700 dark:text-ink-300 hover:bg-surface-muted dark:hover:bg-trading-dark-600'
              }`}
            >
              <span>{config?.icon}</span>
              <span>{config?.slopeName}</span>
              {isLocked && <Lock className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Resources by Level */}
      {resourceGroups.map(({ level, resources, isLocked }) => {
        const config = LEVEL_CONFIGS.find((c) => c.level === level);

        return (
          <div key={level} className="space-y-4">
            {activeLevel === 'all' && (
              <div className="flex items-center gap-3 pb-2 border-b border-surface-line dark:border-trading-dark-600">
                <span className="text-2xl">{config?.icon}</span>
                <div>
                  <h3 className="font-bold text-ink-900 dark:text-white">{config?.slopeName}</h3>
                  <p className="text-sm text-ink-500 dark:text-ink-400">{config?.name} niveau</p>
                </div>
                {isLocked && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400 bg-surface-subtle dark:bg-trading-dark-700 px-2 py-1 rounded">
                    <Lock className="w-3 h-3" />
                    Vergrendeld
                  </span>
                )}
              </div>
            )}

            {/* Tips & Tricks */}
            {resources.tips.length > 0 && (
              <Section
                title="Tips & Tricks"
                icon={<Lightbulb className="w-5 h-5 text-caution-500" />}
                count={resources.tips.length}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {resources.tips.map((tip) => (
                    <TipCard key={tip.id} tip={tip} isLocked={isLocked} />
                  ))}
                </div>
              </Section>
            )}

            {/* Recommended Books */}
            {resources.books.length > 0 && (
              <Section
                title="Aanbevolen Boeken"
                icon={<BookOpen className="w-5 h-5 text-primary-600" />}
                count={resources.books.length}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {resources.books.map((book) => (
                    <BookCard key={book.id} book={book} isLocked={isLocked} />
                  ))}
                </div>
              </Section>
            )}

            {/* Video Tutorials */}
            {resources.videos.length > 0 && (
              <Section
                title="Video Tutorials"
                icon={<PlayCircle className="w-5 h-5 text-negative-600" />}
                count={resources.videos.length}
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {resources.videos.map((video) => (
                    <VideoCard key={video.id} video={video} isLocked={isLocked} />
                  ))}
                </div>
              </Section>
            )}

            {/* External Resources */}
            {resources.externalResources.length > 0 && (
              <Section
                title="Handige Links"
                icon={<ExternalLink className="w-5 h-5 text-positive-600" />}
                count={resources.externalResources.length}
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {resources.externalResources.map((resource) => (
                    <ResourceLink key={resource.id} resource={resource} isLocked={isLocked} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Random Tip Widget - for dashboard or sidebar
export const RandomTipWidget: React.FC = () => {
  const currentLevel = useAppSelector(selectCurrentLevel);
  const [tip, setTip] = useState<TradingTip | null>(null);

  React.useEffect(() => {
    const tips = getTipsUpToLevel(currentLevel);
    if (tips.length > 0) {
      setTip(tips[Math.floor(Math.random() * tips.length)]);
    }
  }, [currentLevel]);

  if (!tip) return null;

  return (
    <div className="bg-gradient-to-br from-caution-50 to-caution-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-caution-500/30 dark:border-caution-600/40">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-caution-50 dark:bg-caution-600/35 rounded-lg">
          <Lightbulb className="w-5 h-5 text-caution-600 dark:text-caution-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-ink-900 dark:text-white text-sm mb-1">
            Tip van de Dag
          </h4>
          <p className="text-xs text-ink-600 dark:text-ink-400 mb-2 font-medium">{tip.title}</p>
          <p className="text-sm text-ink-700 dark:text-ink-300">{tip.content}</p>
        </div>
      </div>
    </div>
  );
};

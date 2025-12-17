import React, { useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Clock,
  Gift,
  Lock,
  Play,
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectUnlockedLevels, selectCompletedLessons, completeLesson, LEVEL_CONFIGS } from '../../store/slices/userProgressSlice';
import { EDUCATION_CURRICULUM, getChaptersForLevel, getLessonById } from '../../config/educationCurriculum';
import type { UserLevel, EducationChapter, EducationLesson, EducationContent, EducationQuiz, QuizQuestion } from '../../types';

// =====================================================
// Content Block Renderers
// =====================================================

const TextBlock: React.FC<{ content: string }> = ({ content }) => (
  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{content}</p>
);

const HeadingBlock: React.FC<{ content: string }> = ({ content }) => (
  <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-3">{content}</h3>
);

const CalloutBlock: React.FC<{ content: string; variant?: 'info' | 'warning' | 'tip' | 'success' }> = ({ content, variant = 'info' }) => {
  const variants = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      text: 'text-blue-800 dark:text-blue-200',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      text: 'text-amber-800 dark:text-amber-200',
    },
    tip: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-400" />,
      text: 'text-green-800 dark:text-green-200',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      text: 'text-emerald-800 dark:text-emerald-200',
    },
  };

  const style = variants[variant];

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${style.bg} ${style.border}`}>
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <p className={`text-sm ${style.text}`}>{content}</p>
    </div>
  );
};

const DefinitionBlock: React.FC<{ term: string; content: string }> = ({ term, content }) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-l-4 border-primary-500">
    <dt className="font-bold text-gray-900 dark:text-white mb-1">{term}</dt>
    <dd className="text-sm text-gray-600 dark:text-gray-400">{content}</dd>
  </div>
);

const ComparisonBlock: React.FC<{
  leftTitle: string;
  rightTitle: string;
  leftItems: string[];
  rightItems: string[];
}> = ({ leftTitle, rightTitle, leftItems, rightItems }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
      <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-3">{leftTitle}</h4>
      <ul className="space-y-2">
        {leftItems.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
            <span className="text-blue-500 mt-1">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
      <h4 className="font-bold text-purple-800 dark:text-purple-200 mb-3">{rightTitle}</h4>
      <ul className="space-y-2">
        {rightItems.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-purple-700 dark:text-purple-300">
            <span className="text-purple-500 mt-1">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const ListBlock: React.FC<{ content: string; items: string[] }> = ({ content, items }) => (
  <div>
    {content && <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">{content}</p>}
    <ul className="space-y-1.5 ml-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
          <span className="text-primary-500 mt-1.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const TableBlock: React.FC<{ columns: string[]; rows: string[][] }> = ({ columns, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-100 dark:bg-gray-800">
          {columns.map((col, i) => (
            <th key={i} className="text-left p-3 font-semibold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            {row.map((cell, j) => (
              <td key={j} className="p-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ExampleBlock: React.FC<{ content: string; caption?: string }> = ({ content, caption }) => (
  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
    {caption && (
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {caption}
      </div>
    )}
    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">{content}</pre>
  </div>
);

const AnalogyBlock: React.FC<{ content: string; caption?: string }> = ({ content, caption }) => (
  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xl">💡</span>
      {caption && <span className="font-semibold text-amber-800 dark:text-amber-200">{caption}</span>}
    </div>
    <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">{content}</p>
  </div>
);

const FormulaBlock: React.FC<{ content: string }> = ({ content }) => (
  <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 text-center">
    <code className="text-green-400 font-mono text-lg">{content}</code>
  </div>
);

// Content renderer
const ContentRenderer: React.FC<{ block: EducationContent }> = ({ block }) => {
  switch (block.type) {
    case 'text':
      return <TextBlock content={block.content} />;
    case 'heading':
      return <HeadingBlock content={block.content} />;
    case 'callout':
      return <CalloutBlock content={block.content} variant={block.variant} />;
    case 'definition':
      return <DefinitionBlock term={block.term || ''} content={block.content} />;
    case 'comparison':
      return (
        <ComparisonBlock
          leftTitle={block.leftTitle || ''}
          rightTitle={block.rightTitle || ''}
          leftItems={block.leftItems || []}
          rightItems={block.rightItems || []}
        />
      );
    case 'list':
      return <ListBlock content={block.content} items={block.items || []} />;
    case 'table':
      return <TableBlock columns={block.columns || []} rows={block.rows || []} />;
    case 'example':
      return <ExampleBlock content={block.content} caption={block.caption} />;
    case 'analogy':
      return <AnalogyBlock content={block.content} caption={block.caption} />;
    case 'formula':
      return <FormulaBlock content={block.content} />;
    default:
      return <TextBlock content={block.content} />;
  }
};

// =====================================================
// Quiz Component
// =====================================================

interface QuizProps {
  quiz: EducationQuiz;
  onComplete: (score: number) => void;
}

const Quiz: React.FC<QuizProps> = ({ quiz, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const question = quiz.questions[currentQuestion];
  const isAnswered = selectedAnswers[currentQuestion] !== undefined;
  const isCorrect = selectedAnswers[currentQuestion] === question.correctIndex;

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: index });
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score
      const correctCount = quiz.questions.filter(
        (q, i) => selectedAnswers[i] === q.correctIndex
      ).length;
      const score = Math.round((correctCount / quiz.questions.length) * 100);
      setShowResults(true);
      onComplete(score);
    }
  };

  if (showResults) {
    const correctCount = quiz.questions.filter(
      (q, i) => selectedAnswers[i] === q.correctIndex
    ).length;
    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
          passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        }`}>
          {passed ? (
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          )}
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {passed ? 'Gefeliciteerd!' : 'Helaas...'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Je score: {correctCount}/{quiz.questions.length} ({score}%)
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {passed
            ? 'Je hebt de quiz gehaald en de les voltooid!'
            : `Je hebt ${quiz.passingScore}% nodig om te slagen. Probeer het opnieuw!`}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">Quiz</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Vraag {currentQuestion + 1} van {quiz.questions.length}
        </span>
      </div>

      <p className="text-gray-800 dark:text-gray-200 mb-4 font-medium">{question.question}</p>

      <div className="space-y-2">
        {question.options.map((option, i) => {
          const isSelected = selectedAnswers[currentQuestion] === i;
          const isCorrectOption = i === question.correctIndex;

          let buttonClass = 'w-full text-left p-3 rounded-lg border transition-colors ';
          if (!isAnswered) {
            buttonClass += 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700';
          } else if (isCorrectOption) {
            buttonClass += 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200';
          } else if (isSelected) {
            buttonClass += 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200';
          } else {
            buttonClass += 'border-gray-200 dark:border-gray-700 opacity-50';
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={isAnswered}
              className={buttonClass}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
              </div>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className={`mt-4 p-4 rounded-lg ${isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
          <p className={`text-sm ${isCorrect ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
            <strong>{isCorrect ? 'Correct!' : 'Uitleg:'}</strong> {question.explanation}
          </p>
        </div>
      )}

      {isAnswered && (
        <button
          onClick={handleNext}
          className="mt-4 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
        >
          {currentQuestion < quiz.questions.length - 1 ? 'Volgende vraag' : 'Bekijk resultaat'}
        </button>
      )}
    </div>
  );
};

// =====================================================
// Lesson Viewer Component
// =====================================================

interface LessonViewerProps {
  lesson: EducationLesson;
  chapter: EducationChapter;
  onBack: () => void;
  onComplete: () => void;
  isCompleted: boolean;
  nextLesson?: { chapter: EducationChapter; lesson: EducationLesson };
  prevLesson?: { chapter: EducationChapter; lesson: EducationLesson };
  onNavigate: (lessonId: string) => void;
}

const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  chapter,
  onBack,
  onComplete,
  isCompleted,
  nextLesson,
  prevLesson,
  onNavigate,
}) => {
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const handleQuizComplete = (score: number) => {
    setQuizScore(score);
    setQuizCompleted(true);
    if (score >= (lesson.quiz?.passingScore || 70)) {
      onComplete();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar overzicht
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span>{chapter.icon}</span>
          <span>{chapter.title}</span>
          <ChevronRight className="w-4 h-4" />
          <span>Les {lesson.order}</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {lesson.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {lesson.estimatedDuration}
          </span>
          <span className="flex items-center gap-1">
            <Gift className="w-4 h-4" />
            +{lesson.creditsAwarded} credits
          </span>
          {isCompleted && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              Voltooid
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm space-y-6">
        {lesson.content.map((block, index) => (
          <ContentRenderer key={index} block={block} />
        ))}
      </div>

      {/* Quiz Section */}
      {lesson.quiz && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Test je kennis
          </h2>
          <Quiz quiz={lesson.quiz} onComplete={handleQuizComplete} />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        {prevLesson ? (
          <button
            onClick={() => onNavigate(prevLesson.lesson.id)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Vorige: {prevLesson.lesson.title}</span>
          </button>
        ) : (
          <div />
        )}

        {nextLesson ? (
          <button
            onClick={() => onNavigate(nextLesson.lesson.id)}
            className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            <span className="text-sm">Volgende: {nextLesson.lesson.title}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            <span className="text-sm">Terug naar overzicht</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// =====================================================
// Chapter Card Component
// =====================================================

interface ChapterCardProps {
  chapter: EducationChapter;
  completedLessons: string[];
  isLocked: boolean;
  onSelectLesson: (lessonId: string) => void;
}

const ChapterCard: React.FC<ChapterCardProps> = ({ chapter, completedLessons, isLocked, onSelectLesson }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const completedCount = chapter.lessons.filter(l => completedLessons.includes(l.id)).length;
  const totalCount = chapter.lessons.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${isLocked ? 'opacity-60' : ''}`}>
      <button
        onClick={() => !isLocked && setIsExpanded(!isExpanded)}
        className={`w-full p-4 flex items-center gap-4 text-left ${!isLocked && 'hover:bg-gray-50 dark:hover:bg-gray-750'} transition-colors`}
        disabled={isLocked}
      >
        <div className="text-3xl flex-shrink-0">{chapter.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white">{chapter.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{chapter.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {chapter.estimatedDuration}
            </span>
            <span>{totalCount} lessen</span>
            {completedCount > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {completedCount}/{totalCount} voltooid
              </span>
            )}
          </div>
        </div>
        {isLocked ? (
          <Lock className="w-5 h-5 text-gray-400" />
        ) : (
          isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Progress bar */}
      {!isLocked && progress > 0 && (
        <div className="px-4 pb-2">
          <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Lessons list */}
      {isExpanded && !isLocked && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {chapter.lessons.map((lesson, index) => {
            const isLessonCompleted = completedLessons.includes(lesson.id);

            return (
              <button
                key={lesson.id}
                onClick={() => onSelectLesson(lesson.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isLessonCompleted
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {isLessonCompleted ? (
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <span className="text-xs text-gray-500">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{lesson.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{lesson.estimatedDuration}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Gift className="w-3 h-3" />
                  +{lesson.creditsAwarded}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =====================================================
// Main Education Curriculum Component
// =====================================================

interface EducationCurriculumProps {
  defaultLevel?: UserLevel;
}

export const EducationCurriculum: React.FC<EducationCurriculumProps> = ({ defaultLevel }) => {
  const dispatch = useAppDispatch();
  const unlockedLevels = useAppSelector(selectUnlockedLevels);
  const completedLessons = useAppSelector(selectCompletedLessons);
  const [activeLevel, setActiveLevel] = useState<UserLevel>(defaultLevel || 'beginner');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const levelOrder: UserLevel[] = ['beginner', 'medior', 'senior', 'expert'];
  const chapters = getChaptersForLevel(activeLevel);
  const isLevelLocked = !unlockedLevels.includes(activeLevel);

  // Get all lessons for navigation
  const getAllLessonsForLevel = (level: UserLevel) => {
    const levelChapters = getChaptersForLevel(level);
    return levelChapters.flatMap(ch => ch.lessons.map(l => ({ chapter: ch, lesson: l })));
  };

  const allLessons = getAllLessonsForLevel(activeLevel);

  // Handle lesson selection
  const selectedLessonData = selectedLessonId ? getLessonById(selectedLessonId) : null;

  // Find prev/next lessons
  const currentIndex = selectedLessonId ? allLessons.findIndex(l => l.lesson.id === selectedLessonId) : -1;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : undefined;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : undefined;

  const handleCompleteLesson = () => {
    if (selectedLessonData) {
      dispatch(completeLesson({
        lessonId: selectedLessonData.lesson.id,
        creditsAwarded: selectedLessonData.lesson.creditsAwarded,
      }));
    }
  };

  // If viewing a lesson
  if (selectedLessonData) {
    return (
      <LessonViewer
        lesson={selectedLessonData.lesson}
        chapter={selectedLessonData.chapter}
        onBack={() => setSelectedLessonId(null)}
        onComplete={handleCompleteLesson}
        isCompleted={completedLessons.includes(selectedLessonData.lesson.id)}
        prevLesson={prevLesson}
        nextLesson={nextLesson}
        onNavigate={setSelectedLessonId}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Level tabs */}
      <div className="flex flex-wrap gap-2">
        {levelOrder.map(level => {
          const config = LEVEL_CONFIGS.find(c => c.level === level);
          const isLocked = !unlockedLevels.includes(level);
          const levelChapters = getChaptersForLevel(level);
          const totalLessons = levelChapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
          const completedCount = levelChapters.reduce((sum, ch) =>
            sum + ch.lessons.filter(l => completedLessons.includes(l.id)).length, 0
          );

          return (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeLevel === level
                  ? 'bg-primary-600 text-white'
                  : isLocked
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>{config?.icon}</span>
              <span>{config?.name}</span>
              {!isLocked && completedCount > 0 && (
                <span className="text-xs opacity-75">({completedCount}/{totalLessons})</span>
              )}
              {isLocked && <Lock className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Level description */}
      {isLevelLocked && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Dit niveau is nog vergrendeld. Voltooi eerst de vorige niveaus of ontgrendel dit niveau in je profiel.
          </p>
        </div>
      )}

      {/* Chapters */}
      <div className="space-y-4">
        {chapters.map(chapter => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            completedLessons={completedLessons}
            isLocked={isLevelLocked}
            onSelectLesson={setSelectedLessonId}
          />
        ))}
      </div>
    </div>
  );
};

export default EducationCurriculum;

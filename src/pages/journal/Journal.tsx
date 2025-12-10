import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  addEntry,
  updateEntry,
  deleteEntry,
  addGoal,
  updateGoal,
  deleteGoal,
  completeGoal,
  selectJournalEntries,
  selectActiveGoals,
  selectCompletedGoals,
} from '../../store/slices/journalSlice';
import type { JournalEntry, JournalGoal, GoalType } from '../../types';
import { formatNumber } from '../../utils/numberFormat';
import {
  BookOpen,
  Plus,
  Target,
  Calendar,
  Edit,
  Trash2,
  Check,
  X,
  TrendingUp,
  DollarSign,
  Coins,
  Filter,
  Tag,
  Smile,
  Meh,
  Frown,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/modals/ConfirmDialog';

const GOAL_TYPES: { id: GoalType; label: string; icon: JSX.Element }[] = [
  { id: 'total-value', label: 'Total portfolio Value', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'assets-under-management', label: 'Assets Under Management', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'monthly-premium', label: 'Monthly Premium Income', icon: <Coins className="w-4 h-4" /> },
  { id: 'custom', label: 'Custom Goal', icon: <Target className="w-4 h-4" /> },
];

const MOOD_OPTIONS = [
  { id: 'great', label: 'Great', icon: <Smile className="w-5 h-5 text-green-600" />, color: 'bg-green-100 text-green-600' },
  { id: 'good', label: 'Good', icon: <Smile className="w-5 h-5 text-blue-600" />, color: 'bg-blue-100 text-blue-600' },
  { id: 'neutral', label: 'Neutral', icon: <Meh className="w-5 h-5 text-gray-600" />, color: 'bg-gray-100 text-gray-600' },
  { id: 'bad', label: 'Bad', icon: <Frown className="w-5 h-5 text-orange-600" />, color: 'bg-orange-100 text-orange-600' },
  { id: 'terrible', label: 'Terrible', icon: <Frown className="w-5 h-5 text-red-600" />, color: 'bg-red-100 text-red-600' },
];

export const Journal: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const dispatch = useAppDispatch();
  const entries = useAppSelector(selectJournalEntries);
  const activeGoals = useAppSelector(selectActiveGoals);
  const completedGoals = useAppSelector(selectCompletedGoals);
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);

  const [activeTab, setActiveTab] = useState<'entries' | 'goals'>('entries');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editingGoal, setEditingGoal] = useState<JournalGoal | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<JournalGoal | null>(null);
  const [showCompletedGoals, setShowCompletedGoals] = useState(false);

  const [entryForm, setEntryForm] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    portfolio: '',
    tags: '',
    mood: 'neutral' as JournalEntry['mood'],
    pnl: undefined as number | undefined,
  });

  const [goalForm, setGoalForm] = useState({
    type: 'total-value' as GoalType,
    title: '',
    description: '',
    targetValue: 0,
    deadline: '',
  });

  useEffect(() => {
    setPageTitle('Trading Journal', 'Track your trades, insights, and goals');
  }, [setPageTitle]);

  const handleSaveEntry = () => {
    if (!entryForm.title || !entryForm.content) {
      alert('Please provide a title and content');
      return;
    }

    const tags = entryForm.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingEntry) {
      // Update existing entry
      dispatch(
        updateEntry({
          ...editingEntry,
          title: entryForm.title,
          content: entryForm.content,
          date: entryForm.date,
          portfolio: entryForm.portfolio || undefined,
          tags: tags.length > 0 ? tags : undefined,
          mood: entryForm.mood,
          pnl: entryForm.pnl,
        })
      );
    } else {
      // Add new entry
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        title: entryForm.title,
        content: entryForm.content,
        date: entryForm.date,
        portfolio: entryForm.portfolio || undefined,
        tags: tags.length > 0 ? tags : undefined,
        mood: entryForm.mood,
        pnl: entryForm.pnl,
        createdAt: new Date().toISOString(),
      };
      dispatch(addEntry(newEntry));
    }

    // Reset form
    setEntryForm({
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      portfolio: '',
      tags: '',
      mood: 'neutral',
      pnl: undefined,
    });
    setShowEntryForm(false);
    setEditingEntry(null);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEntryForm({
      title: entry.title,
      content: entry.content,
      date: entry.date,
      portfolio: entry.portfolio || '',
      tags: entry.tags?.join(', ') || '',
      mood: entry.mood || 'neutral',
      pnl: entry.pnl,
    });
    setShowEntryForm(true);
  };

  const handleDeleteEntry = () => {
    if (entryToDelete) {
      dispatch(deleteEntry(entryToDelete.id));
      setEntryToDelete(null);
    }
  };

  const handleSaveGoal = () => {
    if (!goalForm.title || goalForm.targetValue <= 0) {
      alert('Please provide a title and target value');
      return;
    }

    if (editingGoal) {
      // Update existing goal
      dispatch(
        updateGoal({
          ...editingGoal,
          type: goalForm.type,
          title: goalForm.title,
          description: goalForm.description || undefined,
          targetValue: goalForm.targetValue,
          deadline: goalForm.deadline || undefined,
        })
      );
    } else {
      // Add new goal
      const newGoal: JournalGoal = {
        id: Date.now().toString(),
        type: goalForm.type,
        title: goalForm.title,
        description: goalForm.description || undefined,
        targetValue: goalForm.targetValue,
        deadline: goalForm.deadline || undefined,
        createdAt: new Date().toISOString(),
        completed: false,
      };
      dispatch(addGoal(newGoal));
    }

    // Reset form
    setGoalForm({
      type: 'total-value',
      title: '',
      description: '',
      targetValue: 0,
      deadline: '',
    });
    setShowGoalForm(false);
    setEditingGoal(null);
  };

  const handleEditGoal = (goal: JournalGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      type: goal.type,
      title: goal.title,
      description: goal.description || '',
      targetValue: goal.targetValue,
      deadline: goal.deadline || '',
    });
    setShowGoalForm(true);
  };

  const handleDeleteGoal = () => {
    if (goalToDelete) {
      dispatch(deleteGoal(goalToDelete.id));
      setGoalToDelete(null);
    }
  };

  const getMoodOption = (mood?: JournalEntry['mood']) => {
    return MOOD_OPTIONS.find((m) => m.id === mood) || MOOD_OPTIONS[2];
  };

  const calculateGoalProgress = (goal: JournalGoal) => {
    if (!goal.currentValue) return 0;
    return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('entries')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'entries'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Journal Entries ({entries.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'goals'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Goals ({activeGoals.length} active)
            </div>
          </button>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'entries') {
              setShowEntryForm(true);
              setEditingEntry(null);
            } else {
              setShowGoalForm(true);
              setEditingGoal(null);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'entries' ? 'New Entry' : 'New Goal'}
        </button>
      </div>

      {/* Journal Entries Tab */}
      {activeTab === 'entries' && (
        <div className="space-y-4">
          {/* Entry Form */}
          {showEntryForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingEntry ? 'Edit Entry' : 'New Journal Entry'}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Title
                    </label>
                    <input
                      type="text"
                      value={entryForm.title}
                      onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                      placeholder="Entry title..."
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Date
                    </label>
                    <input
                      type="date"
                      value={entryForm.date}
                      onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Portfolio (Optional)
                    </label>
                    <select
                      value={entryForm.portfolio}
                      onChange={(e) => setEntryForm({ ...entryForm, portfolio: e.target.value })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    >
                      <option value="">All portfolios</option>
                      {portfolios.map((portfolio) => (
                        <option key={portfolio.id} value={portfolio.name}>
                          {portfolio.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Mood
                    </label>
                    <select
                      value={entryForm.mood}
                      onChange={(e) => setEntryForm({ ...entryForm, mood: e.target.value as JournalEntry['mood'] })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    >
                      {MOOD_OPTIONS.map((mood) => (
                        <option key={mood.id} value={mood.id}>
                          {mood.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      P&L (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={entryForm.pnl || ''}
                      onChange={(e) => setEntryForm({ ...entryForm, pnl: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={entryForm.tags}
                      onChange={(e) => setEntryForm({ ...entryForm, tags: e.target.value })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                      placeholder="trading, analysis, strategy..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Content
                  </label>
                  <textarea
                    value={entryForm.content}
                    onChange={(e) => setEntryForm({ ...entryForm, content: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    placeholder="What happened today? What did you learn?"
                    rows={6}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowEntryForm(false);
                      setEditingEntry(null);
                      setEntryForm({
                        title: '',
                        content: '',
                        date: new Date().toISOString().split('T')[0],
                        portfolio: '',
                        tags: '',
                        mood: 'neutral',
                        pnl: undefined,
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEntry}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {editingEntry ? 'Update Entry' : 'Save Entry'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Entries List */}
          {entries.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No journal entries yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start documenting your trading journey and insights
              </p>
              <button
                onClick={() => setShowEntryForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create First Entry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
                const moodOption = getMoodOption(entry.mood);
                return (
                  <div
                    key={entry.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {entry.title}
                          </h3>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${moodOption.color}`}>
                            {moodOption.label}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(entry.date).toLocaleDateString()}
                          </div>
                          {entry.portfolio && (
                            <div className="flex items-center gap-1">
                              <span>Portfolio:</span>
                              <span className="font-medium">{entry.portfolio}</span>
                            </div>
                          )}
                          {entry.pnl !== undefined && (
                            <div className={`flex items-center gap-1 font-medium ${entry.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              <DollarSign className="w-4 h-4" />
                              {entry.pnl >= 0 ? '+' : ''}${formatNumber(entry.pnl, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEntryToDelete(entry)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                      {entry.content}
                    </p>

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="w-4 h-4 text-gray-500" />
                        {entry.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {/* Goal Form */}
          {showGoalForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingGoal ? 'Edit Goal' : 'New Goal'}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Goal Type
                    </label>
                    <select
                      value={goalForm.type}
                      onChange={(e) => setGoalForm({ ...goalForm, type: e.target.value as GoalType })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    >
                      {GOAL_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Target Value
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={goalForm.targetValue}
                      onChange={(e) => setGoalForm({ ...goalForm, targetValue: parseFloat(e.target.value) || 0 })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                      placeholder="500000"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Title
                    </label>
                    <input
                      type="text"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                      placeholder="Reach $500k total portfolio value"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={goalForm.deadline}
                      onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Description (Optional)
                  </label>
                  <textarea
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    placeholder="Why is this goal important? What's your strategy?"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowGoalForm(false);
                      setEditingGoal(null);
                      setGoalForm({
                        type: 'total-value',
                        title: '',
                        description: '',
                        targetValue: 0,
                        deadline: '',
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGoal}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {editingGoal ? 'Update Goal' : 'Save Goal'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Goals */}
          {activeGoals.length === 0 && !showCompletedGoals ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Target className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No goals set yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Set goals to track your trading progress and achievements
              </p>
              <button
                onClick={() => setShowGoalForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create First Goal
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map((goal) => {
                  const progress = calculateGoalProgress(goal);
                  const goalType = GOAL_TYPES.find((t) => t.id === goal.type);

                  return (
                    <div
                      key={goal.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="icon-bg-primary p-3 rounded-lg">
                            {goalType?.icon}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {goal.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {goalType?.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditGoal(goal)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setGoalToDelete(goal)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {goal.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                          {goal.description}
                        </p>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Progress</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatNumber(progress, 1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            ${goal.currentValue?.toLocaleString() || '0'}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${goal.targetValue.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {goal.deadline && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          Deadline: {new Date(goal.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Toggle Completed Goals */}
              {completedGoals.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={() => setShowCompletedGoals(!showCompletedGoals)}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {showCompletedGoals ? 'Hide' : 'Show'} Completed Goals ({completedGoals.length})
                  </button>

                  {showCompletedGoals && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {completedGoals.map((goal) => {
                        const goalType = GOAL_TYPES.find((t) => t.id === goal.type);

                        return (
                          <div
                            key={goal.id}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-6 opacity-75"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {goal.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Completed on {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : ''}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              Target: ${goal.targetValue.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={entryToDelete !== null}
        title="Delete Journal Entry"
        message={entryToDelete ? `Are you sure you want to delete "${entryToDelete.title}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteEntry}
        onCancel={() => setEntryToDelete(null)}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={goalToDelete !== null}
        title="Delete Goal"
        message={goalToDelete ? `Are you sure you want to delete "${goalToDelete.title}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteGoal}
        onCancel={() => setGoalToDelete(null)}
        variant="danger"
      />
    </div>
  );
};

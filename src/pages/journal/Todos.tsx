import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  selectActiveTodos,
  selectCompletedTodos,
} from '../../store/slices/todosSlice';
import {
  addTodo,
  toggleTodo,
  deleteTodo,
  editTodo,
  reopenTodo,
} from '../../store/commands/todoCommands';
import { uuid } from '../../utils/uuid';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { CheckCircle2, Circle, Plus, Trash2, Edit2, RotateCcw, X, Save } from 'lucide-react';

export const Todos: React.FC = () => {
  const { t } = useTranslation();
  const { setPageTitle } = usePageTitle();
  const dispatch = useAppDispatch();
  const activeTodos = useAppSelector(selectActiveTodos);
  const completedTodos = useAppSelector(selectCompletedTodos);

  const [newTodoText, setNewTodoText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    setPageTitle(t('todos.pageTitle'), t('todos.pageSubtitle'));
  }, [setPageTitle, t]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      const now = new Date().toISOString();
      dispatch(
        addTodo(
          { id: uuid(), text: newTodoText.trim(), completed: false, createdAt: now },
          now
        )
      );
      setNewTodoText('');
    }
  };

  const handleToggleTodo = (id: string) => {
    dispatch(toggleTodo(id, new Date().toISOString()));
  };

  const handleDeleteTodo = (id: string) => {
    if (window.confirm(t('todos.confirmDelete'))) {
      dispatch(deleteTodo(id, new Date().toISOString()));
    }
  };

  const handleStartEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      dispatch(editTodo(editingId, editText.trim(), new Date().toISOString()));
      setEditingId(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleReopenTodo = (id: string) => {
    dispatch(reopenTodo(id, new Date().toISOString()));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Form */}
      <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-ink-900 dark:text-white mb-4">
          {t('todos.addNew')}
        </h2>
        <form onSubmit={handleAddTodo} className="flex gap-3">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder={t('todos.addPlaceholder')}
            className="flex-1 px-4 py-3 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white placeholder-ink-500 dark:placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            {t('todos.add')}
          </button>
        </form>
      </div>

      {/* Active Todos */}
      <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-ink-900 dark:text-white">
            {t('todos.active')} ({activeTodos.length})
          </h2>
        </div>

        {activeTodos.length === 0 ? (
          <div className="text-center py-12">
            <Circle className="w-16 h-16 text-ink-300 dark:text-ink-600 mx-auto mb-4" />
            <p className="text-ink-500 dark:text-ink-400">{t('todos.noActiveTodos')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start gap-3 p-4 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:bg-surface dark:hover:bg-trading-dark-700/50 transition-colors"
              >
                <button
                  onClick={() => handleToggleTodo(todo.id)}
                  className="flex-shrink-0 mt-0.5 text-ink-400 hover:text-positive-600 dark:hover:text-positive-500 transition-colors"
                >
                  <Circle className="w-6 h-6" />
                </button>

                {editingId === todo.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-2 text-positive-600 hover:text-positive-700 dark:text-positive-500 dark:hover:text-positive-500"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2 text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="text-ink-900 dark:text-white">{todo.text}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                        {t('todos.created')}: {formatDate(todo.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(todo.id, todo.text)}
                        className="p-2 text-primary-700 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-400"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="p-2 text-negative-600 hover:text-negative-700 dark:text-negative-500 dark:hover:text-negative-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Todos */}
      <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-ink-900 dark:text-white">
            {t('todos.completed')} ({completedTodos.length})
          </h2>
          {completedTodos.length > 0 && (
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-sm text-primary-700 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-400"
            >
              {showCompleted ? t('todos.hide') : t('todos.show')}
            </button>
          )}
        </div>

        {showCompleted && (
          <>
            {completedTodos.length === 0 ? (
              <p className="text-ink-500 dark:text-ink-400 text-sm text-center py-8">
                {t('todos.noCompletedTodos')}
              </p>
            ) : (
              <div className="space-y-2">
                {completedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-start gap-3 p-4 rounded-lg border border-surface-line dark:border-trading-dark-600 bg-surface dark:bg-trading-dark-700/30"
                  >
                    <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-positive-600 dark:text-positive-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-ink-500 dark:text-ink-400 line-through">{todo.text}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-500 mt-1">
                        {t('todos.completedAt')}: {todo.completedAt && formatDate(todo.completedAt)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleReopenTodo(todo.id)}
                        className="p-2 text-primary-700 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-400"
                        title={t('todos.reopen')}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="p-2 text-negative-600 hover:text-negative-700 dark:text-negative-500 dark:hover:text-negative-500"
                        title={t('todos.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Todos;

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectActiveTodos } from '../../store/slices/todosSlice';
import { addTodo, toggleTodo } from '../../store/commands/todoCommands';
import { uuid } from '../../utils/uuid';
import { Circle, Plus } from 'lucide-react';

const TodoListWidget: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const activeTodos = useAppSelector(selectActiveTodos);
  const [newTodoText, setNewTodoText] = useState('');

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

  return (
    <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-ink-900 dark:text-white mb-4">
        {t('todos.title')}
      </h2>

      {/* Quick add form */}
      <form onSubmit={handleAddTodo} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder={t('todos.addPlaceholder')}
            className="flex-1 px-3 py-2 text-sm border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white placeholder-ink-500 dark:placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('todos.add')}</span>
          </button>
        </div>
      </form>

      {/* Todo list */}
      <div className="space-y-2">
        {activeTodos.length === 0 ? (
          <p className="text-ink-500 dark:text-ink-400 text-sm text-center py-4">
            {t('todos.noActiveTodos')}
          </p>
        ) : (
          activeTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface dark:hover:bg-trading-dark-700 transition-colors group"
            >
              <button
                onClick={() => handleToggleTodo(todo.id)}
                className="flex-shrink-0 mt-0.5 text-ink-400 hover:text-positive-600 dark:hover:text-positive-500 transition-colors"
              >
                <Circle className="w-5 h-5" />
              </button>
              <p className="flex-1 text-sm text-ink-700 dark:text-ink-300">{todo.text}</p>
            </div>
          ))
        )}
      </div>

      {activeTodos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-surface-line dark:border-trading-dark-600">
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {t('todos.activeCount', { count: activeTodos.length })}
          </p>
        </div>
      )}
    </div>
  );
};

export default TodoListWidget;

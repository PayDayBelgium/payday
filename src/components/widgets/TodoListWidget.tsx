import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectActiveTodos, addTodo, toggleTodo } from '../../store/slices/todosSlice';
import { CheckCircle2, Circle, Plus } from 'lucide-react';

const TodoListWidget: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const activeTodos = useAppSelector(selectActiveTodos);
  const [newTodoText, setNewTodoText] = useState('');

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      dispatch(addTodo(newTodoText.trim()));
      setNewTodoText('');
    }
  };

  const handleToggleTodo = (id: string) => {
    dispatch(toggleTodo(id));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
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
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('todos.add')}</span>
          </button>
        </div>
      </form>

      {/* Todo list */}
      <div className="space-y-2">
        {activeTodos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            {t('todos.noActiveTodos')}
          </p>
        ) : (
          activeTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <button
                onClick={() => handleToggleTodo(todo.id)}
                className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                <Circle className="w-5 h-5" />
              </button>
              <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                {todo.text}
              </p>
            </div>
          ))
        )}
      </div>

      {activeTodos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('todos.activeCount', { count: activeTodos.length })}
          </p>
        </div>
      )}
    </div>
  );
};

export default TodoListWidget;

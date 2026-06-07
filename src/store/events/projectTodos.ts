import type { Todo } from '../slices/todosSlice';
import type {
  DomainEvent,
  TodoAddedPayload,
  TodoEditedPayload,
  TodoCompletedPayload,
  TodoReopenedPayload,
  TodoDeletedPayload,
} from './types';

/**
 * Pure fold of a single domain event into the todos array.
 * Returns the same reference for events this projection does not own,
 * so callers can cheaply detect no-ops.
 */
export function applyTodoEvent(todos: Todo[], event: DomainEvent): Todo[] {
  switch (event.type) {
    case 'TodoAdded': {
      const { todo } = event.payload as TodoAddedPayload;
      return [...todos, todo];
    }

    case 'TodoEdited': {
      const { id, text } = event.payload as TodoEditedPayload;
      return todos.map((t) => (t.id === id ? { ...t, text } : t));
    }

    case 'TodoCompleted': {
      const { id, completedAt } = event.payload as TodoCompletedPayload;
      return todos.map((t) =>
        t.id === id ? { ...t, completed: true, completedAt } : t
      );
    }

    case 'TodoReopened': {
      const { id } = event.payload as TodoReopenedPayload;
      return todos.map((t) => {
        if (t.id !== id) return t;
        const { completedAt: _removed, ...rest } = t;
        return { ...rest, completed: false };
      });
    }

    case 'TodoDeleted': {
      const { id } = event.payload as TodoDeletedPayload;
      return todos.filter((t) => t.id !== id);
    }

    default:
      return todos;
  }
}

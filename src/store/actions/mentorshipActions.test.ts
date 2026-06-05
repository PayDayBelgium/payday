import { describe, it, expect, vi } from 'vitest';
import { submitMentorshipRequest } from './mentorshipActions';

describe('mentorshipActions', () => {
  it('submitMentorshipRequest dispatches submitRequest with status pending and generated id/createdAt', () => {
    const dispatch = vi.fn();
    submitMentorshipRequest({
      focus: 'options',
      level: 'beginner',
      style: 'coaching',
      availability: 'weekends',
      message: 'graag begeleiding',
    })(dispatch as any);

    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('mentorship/submitRequest');
    expect(action.payload.status).toBe('pending');
    expect(action.payload.focus).toBe('options');
    expect(action.payload.id).toBeTruthy();
    expect(action.payload.createdAt).toBeTruthy();
  });

  it('submitMentorshipRequest does NOT dispatch credits', () => {
    const dispatch = vi.fn();
    submitMentorshipRequest({
      focus: 'risk',
      level: 'medior',
      style: 'async',
      availability: 'avonds',
      message: 'x',
    })(dispatch as any);
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('userProgress/addCredits');
  });
});

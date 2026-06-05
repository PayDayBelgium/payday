import { describe, it, expect } from 'vitest';
import reducer, {
  submitRequest,
  selectLatestRequest,
  selectHasPendingRequest,
} from './mentorshipSlice';
import type { MentorshipRequest } from '../../types';

const baseReq = (over: Partial<MentorshipRequest> = {}): MentorshipRequest => ({
  id: over.id ?? 'm1',
  focus: over.focus ?? 'options',
  level: over.level ?? 'beginner',
  style: over.style ?? 'coaching',
  availability: over.availability ?? 'weekends',
  message: over.message ?? 'graag begeleiding',
  createdAt: over.createdAt ?? '2026-01-01T00:00:00.000Z',
  status: 'pending',
  ...over,
});

describe('mentorshipSlice', () => {
  it('submitRequest prepends the request', () => {
    const state = reducer({ requests: [baseReq({ id: 'old' })] }, submitRequest(baseReq({ id: 'new' })));
    expect(state.requests[0].id).toBe('new');
    expect(state.requests).toHaveLength(2);
  });

  it('selectLatestRequest returns the first request or undefined', () => {
    const empty: any = { mentorship: { requests: [] } };
    expect(selectLatestRequest(empty)).toBeUndefined();
    const root: any = { mentorship: { requests: [baseReq({ id: 'a' }), baseReq({ id: 'b' })] } };
    expect(selectLatestRequest(root)!.id).toBe('a');
  });

  it('selectHasPendingRequest reflects whether a pending request exists', () => {
    const empty: any = { mentorship: { requests: [] } };
    expect(selectHasPendingRequest(empty)).toBe(false);
    const root: any = { mentorship: { requests: [baseReq()] } };
    expect(selectHasPendingRequest(root)).toBe(true);
  });
});

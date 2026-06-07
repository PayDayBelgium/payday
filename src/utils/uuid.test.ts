import { describe, it, expect } from 'vitest';
import { uuid } from './uuid';

describe('uuid', () => {
  it('returns a v4-shaped string', () => {
    expect(uuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('returns a different value each call', () => {
    expect(uuid()).not.toBe(uuid());
  });
});

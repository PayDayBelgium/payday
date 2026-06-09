import { describe, it, expect } from 'vitest';
import { parseCountInput } from './inputFormat';

describe('parseCountInput', () => {
  it('returns 0 for an empty field (so it can be cleared and retyped)', () => {
    expect(parseCountInput('')).toBe(0);
    expect(parseCountInput('   ')).toBe(0);
  });

  it('does NOT force a 1 back in on empty input (the reported bug)', () => {
    // Old behaviour was `parseInt('') || 1` === 1, which made the field
    // impossible to clear. It must now be 0 so the input renders empty.
    expect(parseCountInput('')).not.toBe(1);
  });

  it('parses a positive integer', () => {
    expect(parseCountInput('5')).toBe(5);
    expect(parseCountInput('12')).toBe(12);
  });

  it('returns 0 for invalid / negative input', () => {
    expect(parseCountInput('abc')).toBe(0);
    expect(parseCountInput('-3')).toBe(0);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { parseCountInput, parseNumberInput } from './inputFormat';

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

describe('parseNumberInput', () => {
  afterEach(() => {
    localStorage.removeItem('payday-language');
  });

  it('strips the en thousand separator before parsing', () => {
    localStorage.setItem('payday-language', 'en');
    expect(parseNumberInput('1,000')).toBe(1000);
    expect(parseNumberInput('1,234.56')).toBe(1234.56);
  });

  it('strips the nl thousand separator and swaps the decimal comma', () => {
    localStorage.setItem('payday-language', 'nl');
    expect(parseNumberInput('1.000')).toBe(1000);
    expect(parseNumberInput('1.234,56')).toBe(1234.56);
  });

  it('returns 0 for empty or unparseable input', () => {
    localStorage.setItem('payday-language', 'en');
    expect(parseNumberInput('')).toBe(0);
    expect(parseNumberInput('abc')).toBe(0);
  });
});

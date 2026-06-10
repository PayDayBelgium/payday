import { describe, it, expect } from 'vitest';
import { isSafeHttpUrl } from './urlSafety';

describe('isSafeHttpUrl', () => {
  it('accepts absolute http(s) URLs', () => {
    expect(isSafeHttpUrl('https://broker.example.com/login')).toBe(true);
    expect(isSafeHttpUrl('http://broker.example.com')).toBe(true);
    expect(isSafeHttpUrl('https://example.com/path?query=1#hash')).toBe(true);
  });

  it('rejects script-bearing schemes', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('JavaScript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('rejects other schemes, relative URLs and garbage', () => {
    expect(isSafeHttpUrl('ftp://example.com')).toBe(false);
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeHttpUrl('//example.com')).toBe(false);
    expect(isSafeHttpUrl('/relative/path')).toBe(false);
    expect(isSafeHttpUrl('example.com')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(42)).toBe(false);
  });
});

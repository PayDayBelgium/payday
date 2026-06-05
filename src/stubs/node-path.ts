// Stub for node:path — used only by @anthropic-ai/sdk agent-toolset (server-side).
// This module is never called in the browser; the stub prevents bundling errors.
export const join = (...parts: string[]) => parts.join('/');
export const resolve = (...parts: string[]) => parts.join('/');
export const dirname = (p: string) => p.substring(0, p.lastIndexOf('/')) || '/';
export const basename = (p: string, ext?: string) => {
  const base = p.substring(p.lastIndexOf('/') + 1);
  return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
};
export const extname = (p: string) => {
  const idx = p.lastIndexOf('.');
  return idx > 0 ? p.substring(idx) : '';
};
export const isAbsolute = (p: string) => p.startsWith('/');
export const relative = (from: string, to: string) => to;
export const normalize = (p: string) => p;
export const sep = '/';
export const delimiter = ':';
export default { join, resolve, dirname, basename, extname, isAbsolute, relative, normalize, sep, delimiter };

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Vite plugin that stubs every `node:*` built-in import with no-op exports.
// Required because @anthropic-ai/sdk bundles server-side tooling (agent-toolset)
// that statically imports node:crypto, node:fs, node:path, etc.
// Those code paths are never reached in a browser; the stubs suppress bundling errors.
// enforce:'pre' ensures this runs before Vite's own vite:resolve plugin.
const nodeBuiltinStubPlugin = {
  name: 'node-builtin-stub',
  enforce: 'pre' as const,
  resolveId(id: string) {
    if (id.startsWith('node:')) return `\0node-stub:${id}`;
    return null;
  },
  load(id: string) {
    if (!id.startsWith('\0node-stub:node:')) return null;
    const mod = id.replace('\0node-stub:node:', '');
    // Per-module stubs with all named exports the agent-toolset uses statically.
    const stubs: Record<string, string> = {
      'crypto': `
        export const randomUUID = () => 'stub-uuid';
        export const createHash = () => ({ update: () => ({ digest: () => '' }) });
        export default { randomUUID, createHash };
      `,
      'fs': `
        export const readFileSync = () => '';
        export const writeFileSync = () => {};
        export const existsSync = () => false;
        export const mkdirSync = () => {};
        export const statSync = () => ({});
        export const createReadStream = () => ({ pipe: () => {} });
        export const createWriteStream = () => ({ write: () => {}, end: () => {} });
        export const readdirSync = () => [];
        export const unlinkSync = () => {};
        export const renameSync = () => {};
        export const readlinkSync = () => '';
        export const lstatSync = () => ({});
        export const copyFileSync = () => {};
        export default {};
      `,
      'fs/promises': `
        export const readFile = async () => '';
        export const writeFile = async () => {};
        export const mkdir = async () => {};
        export const stat = async () => ({});
        export const rename = async () => {};
        export const unlink = async () => {};
        export const readdir = async () => [];
        export const realpath = async () => '';
        export const lstat = async () => ({});
        export const open = async () => ({});
        export const copyFile = async () => {};
        export const readlink = async () => '';
        export default {};
      `,
      'path': `
        export const join = (...a) => a.join('/');
        export const resolve = (...a) => a.join('/');
        export const dirname = (p) => p.substring(0, p.lastIndexOf('/')) || '/';
        export const basename = (p, e) => { const b = p.substring(p.lastIndexOf('/') + 1); return e && b.endsWith(e) ? b.slice(0, -e.length) : b; };
        export const extname = (p) => { const i = p.lastIndexOf('.'); return i > 0 ? p.substring(i) : ''; };
        export const isAbsolute = (p) => p.startsWith('/');
        export const relative = (f, t) => t;
        export const normalize = (p) => p;
        export const sep = '/';
        export const delimiter = ':';
        export default { join, resolve, dirname, basename, extname, isAbsolute, relative, normalize, sep, delimiter };
      `,
      'child_process': `
        export const execFile = () => {};
        export const spawn = () => ({ stdout: { on: () => {} }, stderr: { on: () => {} }, on: () => {} });
        export const exec = () => {};
        export default { execFile, spawn, exec };
      `,
      'util': `
        export const promisify = (fn) => (...args) => Promise.resolve();
        export const inspect = (v) => String(v);
        export default { promisify, inspect };
      `,
      'stream': `
        export class Readable { constructor() {} static from() { return new Readable(); } }
        export class Writable { constructor() {} }
        export class Transform { constructor() {} }
        export default { Readable, Writable, Transform };
      `,
      'stream/promises': `
        export const pipeline = async () => {};
        export default { pipeline };
      `,
      'readline': `
        export const createInterface = () => ({ question: () => {}, close: () => {} });
        export default { createInterface };
      `,
    };
    return stubs[mod] ?? `export default {};`;
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [nodeBuiltinStubPlugin, react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Isolate heavy vendors into their own chunks so they are cached separately
        // and (for the AI SDK, now imported dynamically) loaded only when needed.
        manualChunks: {
          'vendor-anthropic': ['@anthropic-ai/sdk'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
})

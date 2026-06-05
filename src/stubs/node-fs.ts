// Stub for node:fs and node:fs/promises — used only by @anthropic-ai/sdk agent-toolset (server-side).
// This module is never called in the browser; the stub prevents bundling errors.
export const readFile = async () => { throw new Error('node:fs not available in browser'); };
export const writeFile = async () => { throw new Error('node:fs not available in browser'); };
export const mkdir = async () => { throw new Error('node:fs not available in browser'); };
export const stat = async () => { throw new Error('node:fs not available in browser'); };
export const rename = async () => { throw new Error('node:fs not available in browser'); };
export const unlink = async () => { throw new Error('node:fs not available in browser'); };
export const readdir = async () => { throw new Error('node:fs not available in browser'); };
export const realpath = async () => { throw new Error('node:fs not available in browser'); };
export const lstat = async () => { throw new Error('node:fs not available in browser'); };
export const open = async () => { throw new Error('node:fs not available in browser'); };
export const copyFile = async () => { throw new Error('node:fs not available in browser'); };
export default {};

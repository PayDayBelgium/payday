// Stub for node:crypto — used only by @anthropic-ai/sdk agent-toolset (server-side).
// This module is never called in the browser; the stub prevents bundling errors.
export const randomUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};
export default { randomUUID };

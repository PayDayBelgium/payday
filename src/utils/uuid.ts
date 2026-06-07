/**
 * Stable, sync-safe identifier for domain events and entities.
 * Uses the platform crypto UUID (available in modern browsers and jsdom).
 */
export function uuid(): string {
  return crypto.randomUUID();
}

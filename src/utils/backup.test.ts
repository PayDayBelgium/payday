import { describe, it, expect } from 'vitest';
import { isValidBackupEvent, parseBackupFile, type BackupData } from './backup';

const validEvent = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'evt-1',
  seq: 0,
  type: 'TodoAdded',
  payload: { todo: { id: 't1', text: 'check the wheel', createdAt: '2026-06-10' } },
  timestamp: '2026-06-10T08:00:00.000Z',
  actor: 'stijn',
  schemaVersion: 1,
  ...overrides,
});

const makeBackupFile = (events: unknown[]): File => {
  const backup = {
    version: '2.0.0',
    timestamp: '2026-06-10T08:00:00.000Z',
    events,
  };
  return new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
};

describe('isValidBackupEvent', () => {
  it('accepts a well-formed persisted event', () => {
    expect(isValidBackupEvent(validEvent())).toBe(true);
    expect(isValidBackupEvent(validEvent({ seq: 42, type: 'PortfolioCreated' }))).toBe(true);
  });

  it('rejects unknown event types', () => {
    expect(isValidBackupEvent(validEvent({ type: 'EvilEventInjected' }))).toBe(false);
    expect(isValidBackupEvent(validEvent({ type: '' }))).toBe(false);
    expect(isValidBackupEvent(validEvent({ type: 7 }))).toBe(false);
  });

  it('rejects non-object payloads', () => {
    expect(isValidBackupEvent(validEvent({ payload: null }))).toBe(false);
    expect(isValidBackupEvent(validEvent({ payload: 'string' }))).toBe(false);
    expect(isValidBackupEvent(validEvent({ payload: [1, 2] }))).toBe(false);
    expect(isValidBackupEvent(validEvent({ payload: undefined }))).toBe(false);
  });

  it('rejects missing or malformed seq', () => {
    const { seq: _seq, ...withoutSeq } = validEvent();
    expect(isValidBackupEvent(withoutSeq)).toBe(false);
    expect(isValidBackupEvent(validEvent({ seq: -1 }))).toBe(false);
    expect(isValidBackupEvent(validEvent({ seq: 1.5 }))).toBe(false);
    expect(isValidBackupEvent(validEvent({ seq: '0' }))).toBe(false);
  });

  it('rejects missing envelope fields and non-objects', () => {
    expect(isValidBackupEvent(validEvent({ id: undefined }))).toBe(false);
    expect(isValidBackupEvent(validEvent({ timestamp: undefined }))).toBe(false);
    expect(isValidBackupEvent(validEvent({ actor: undefined }))).toBe(false);
    expect(isValidBackupEvent(validEvent({ schemaVersion: undefined }))).toBe(false);
    expect(isValidBackupEvent(null)).toBe(false);
    expect(isValidBackupEvent('event')).toBe(false);
    expect(isValidBackupEvent([])).toBe(false);
  });
});

describe('parseBackupFile', () => {
  it('resolves a valid v2 backup file', async () => {
    const backup: BackupData = await parseBackupFile(
      makeBackupFile([validEvent(), validEvent({ id: 'evt-2', seq: 1, type: 'PositionOpened' })])
    );
    expect(backup.version).toBe('2.0.0');
    expect(backup.events).toHaveLength(2);
  });

  it('resolves an empty event log', async () => {
    const backup = await parseBackupFile(makeBackupFile([]));
    expect(backup.events).toEqual([]);
  });

  it('rejects the whole file when one event has an unknown type', async () => {
    await expect(
      parseBackupFile(
        makeBackupFile([validEvent(), validEvent({ id: 'evt-2', seq: 1, type: 'NotARealEvent' })])
      )
    ).rejects.toThrow();
  });

  it('rejects the whole file when one event has a non-object payload', async () => {
    await expect(
      parseBackupFile(makeBackupFile([validEvent({ payload: 'malicious' })]))
    ).rejects.toThrow();
  });

  it('rejects the whole file when one event is missing seq', async () => {
    const { seq: _seq, ...withoutSeq } = validEvent();
    await expect(parseBackupFile(makeBackupFile([withoutSeq]))).rejects.toThrow();
  });

  it('still rejects pre-v2 backups without an events array', async () => {
    const legacy = new File(
      [JSON.stringify({ version: '1.0.0', timestamp: 'x', positions: [] })],
      'old.json',
      { type: 'application/json' }
    );
    await expect(parseBackupFile(legacy)).rejects.toThrow(/older version/);
  });

  it('rejects unparseable files', async () => {
    const junk = new File(['not json at all'], 'junk.json', { type: 'application/json' });
    await expect(parseBackupFile(junk)).rejects.toThrow(/parse/);
  });
});

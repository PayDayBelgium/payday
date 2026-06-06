// src/services/ai/systemPrompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './systemPrompt';
import { AGENT_RULES } from './policy';

describe('buildSystemPrompt', () => {
  it('bevat elke agent-regel', () => {
    const prompt = buildSystemPrompt({ userLevel: 'beginner' });
    for (const rule of AGENT_RULES) {
      expect(prompt).toContain(rule);
    }
  });

  it('noemt het niveau van de gebruiker', () => {
    const prompt = buildSystemPrompt({ userLevel: 'expert' });
    expect(prompt.toLowerCase()).toContain('expert');
  });

  it('noemt dat het over PayDay gaat', () => {
    const prompt = buildSystemPrompt({ userLevel: 'medior' });
    expect(prompt).toContain('PayDay');
  });
});

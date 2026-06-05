// src/services/ai/systemPrompt.ts
import type { UserLevel } from '../../types';
import { AGENT_RULES } from './policy';

export interface SystemPromptContext {
  userLevel: UserLevel;
}

// Bouwt de systeemprompt op uit een vaste beschrijving + de agent-policy + niveau-context.
export const buildSystemPrompt = (ctx: SystemPromptContext): string => {
  const rules = AGENT_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n');
  return [
    'Je bent de AI-assistent in PayDay, een options-trading- en portfolio-tracker.',
    'Je helpt de gebruiker met vragen over de app en diens portefeuille.',
    '',
    `Het huidige niveau van de gebruiker is: ${ctx.userLevel}.`,
    'Geef geen uitleg of voorstellen over functies boven dit niveau; verwijs in dat geval naar het pad om ze te ontgrendelen.',
    '',
    'Regels:',
    rules,
  ].join('\n');
};

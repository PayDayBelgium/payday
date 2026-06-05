// src/contexts/AIAssistantContext.tsx
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { selectCurrentLevel, selectUnlockedLevels } from '../store/slices/userProgressSlice';
import type { RootState } from '../store';
import { loadAIConfig } from '../services/ai/config';
import { createProvider } from '../services/ai/providers';
import { buildSystemPrompt } from '../services/ai/systemPrompt';
import type { AIMessage, ContentBlock } from '../services/ai/types';
import {
  TOOL_SCHEMAS,
  isReadTool,
  executeReadTool,
  parseProposedChange,
  applyChanges,
  describeChange,
  type ProposedChange,
} from '../services/ai/tools';
import i18n from '../i18n/config';

export interface ImageAttachment {
  mediaType: string;
  dataBase64: string;
}

export interface ChatMessage extends AIMessage {
  id: string;
  pending?: boolean; // antwoord is nog aan het streamen
  error?: string;    // foutmelding i.p.v. inhoud
}

interface AIAssistantContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: ChatMessage[];
  isStreaming: boolean;
  pendingChanges: ProposedChange[];
  sendText: (text: string, images?: ImageAttachment[]) => Promise<void>;
  confirmChanges: () => void;
  cancelChanges: () => void;
  abort: () => void;
  clear: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextValue | null>(null);

const MAX_TOOL_ROUNDS = 8;

// Vertaalt foutcodes van de provider naar leesbare gebruikerstekst.
const errorToMessage = (code: string): string => {
  switch (code) {
    case 'NO_API_KEY':
      return i18n.t('ai.noKeyError');
    case 'PROVIDER_NOT_AVAILABLE':
      return i18n.t('ai.providerUnavailable');
    case 'OVERLOADED':
      return i18n.t('ai.errorOverloaded');
    case 'RATE_LIMIT':
      return i18n.t('ai.errorRateLimit');
    case 'AUTH':
      return i18n.t('ai.errorAuth');
    default:
      return code;
  }
};

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

export const AIAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ProposedChange[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const convoRef = useRef<AIMessage[]>([]); // volledige provider-conversatie (incl. tools)
  const userLevel = useAppSelector(selectCurrentLevel);
  const unlockedLevels = useAppSelector(selectUnlockedLevels);
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const clear = useCallback(() => {
    setMessages([]);
    setPendingChanges([]);
    convoRef.current = [];
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Voegt een assistent-tekstbericht toe in de UI en geeft de id terug.
  const addAssistantBubble = useCallback((): string => {
    const id = nextId();
    setMessages((prev) => [
      ...prev,
      { id, role: 'assistant', content: [{ kind: 'text', text: '' }], pending: true },
    ]);
    return id;
  }, []);

  const sendText = useCallback(
    async (text: string, images: ImageAttachment[] = []) => {
      const trimmed = text.trim();
      if ((!trimmed && images.length === 0) || isStreaming) return;

      // Gebruikersbericht opbouwen.
      const userContent: ContentBlock[] = [];
      if (trimmed) userContent.push({ kind: 'text', text: trimmed });
      for (const img of images) {
        userContent.push({ kind: 'image', mediaType: img.mediaType, dataBase64: img.dataBase64 });
      }
      convoRef.current.push({ role: 'user', content: userContent });
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: userContent }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const updateBubble = (id: string, patch: (prevText: string) => Partial<ChatMessage>) =>
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== id) return m;
            const prevText = m.content[0]?.kind === 'text' ? m.content[0].text : '';
            return { ...m, ...patch(prevText) };
          }),
        );
      const removeBubble = (id: string) => setMessages((prev) => prev.filter((m) => m.id !== id));

      const collected: ProposedChange[] = [];

      try {
        const cfg = loadAIConfig();
        const provider = createProvider(cfg);
        const system = buildSystemPrompt({ userLevel, unlockedLevels });
        const model = cfg.model;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const bubbleId = addAssistantBubble();
          let assistantText = '';
          const toolUses: { id: string; name: string; input: unknown }[] = [];
          let errored = false;

          for await (const event of provider.streamChat({
            system,
            model,
            messages: convoRef.current,
            tools: TOOL_SCHEMAS,
            signal: controller.signal,
          })) {
            if (event.type === 'text_delta') {
              assistantText += event.text;
              updateBubble(bubbleId, () => ({ content: [{ kind: 'text', text: assistantText }] }));
            } else if (event.type === 'tool_use') {
              toolUses.push({ id: event.id, name: event.name, input: event.input });
            } else if (event.type === 'error') {
              updateBubble(bubbleId, () => ({ pending: false, error: errorToMessage(event.message) }));
              errored = true;
            }
          }

          // Assistent-turn vastleggen in de provider-conversatie.
          const assistantContent: ContentBlock[] = [];
          if (assistantText) assistantContent.push({ kind: 'text', text: assistantText });
          for (const tu of toolUses) {
            assistantContent.push({ kind: 'tool_use', id: tu.id, name: tu.name, input: tu.input });
          }
          if (assistantContent.length > 0) {
            convoRef.current.push({ role: 'assistant', content: assistantContent });
          }

          // UI-bubble afronden: lege bubbles (alleen tools) weghalen.
          if (errored) break;
          if (assistantText) updateBubble(bubbleId, () => ({ pending: false }));
          else removeBubble(bubbleId);

          if (toolUses.length === 0) break; // model is klaar

          // Tools afhandelen.
          const resultBlocks: ContentBlock[] = [];
          let proposedThisRound = false;
          for (const tu of toolUses) {
            if (isReadTool(tu.name)) {
              const res = executeReadTool(tu.name, () => store.getState());
              resultBlocks.push({ kind: 'tool_result', toolUseId: tu.id, content: res });
            } else {
              const change = parseProposedChange(tu.name, tu.input, tu.id);
              if (change) {
                collected.push(change);
                proposedThisRound = true;
                resultBlocks.push({
                  kind: 'tool_result',
                  toolUseId: tu.id,
                  content: 'Voorstel geregistreerd; wacht op bevestiging van de gebruiker.',
                });
              } else {
                resultBlocks.push({
                  kind: 'tool_result',
                  toolUseId: tu.id,
                  content: 'Onbekende tool.',
                  isError: true,
                });
              }
            }
          }
          convoRef.current.push({ role: 'user', content: resultBlocks });

          // Na een voorstel stoppen we de beurt: de gebruiker moet eerst
          // bevestigen/annuleren (via de kaart). Zo blijft het model niet
          // doorpraten en geeft de knop weer 'versturen' i.p.v. 'stop'.
          if (proposedThisRound) break;
        }
      } catch (err) {
        const code = err instanceof Error ? err.message : 'ERROR';
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', content: [{ kind: 'text', text: '' }], error: errorToMessage(code) },
        ]);
      } finally {
        if (collected.length > 0) setPendingChanges(collected);
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, userLevel, unlockedLevels, addAssistantBubble, store],
  );

  const confirmChanges = useCallback(() => {
    if (pendingChanges.length === 0) return;
    applyChanges(pendingChanges, () => store.getState(), dispatch);
    const summary = pendingChanges.map((c) => `• ${describeChange(c)}`).join('\n');
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: 'assistant',
        content: [{ kind: 'text', text: `${i18n.t('ai.created')}\n${summary}` }],
      },
    ]);
    // Houd de gesprekscontext op de hoogte voor een volgende beurt.
    convoRef.current.push({
      role: 'user',
      content: [{ kind: 'text', text: 'Ik heb de voorgestelde wijzigingen bevestigd; ze zijn nu aangemaakt.' }],
    });
    setPendingChanges([]);
  }, [pendingChanges, dispatch, store]);

  const cancelChanges = useCallback(() => {
    if (pendingChanges.length === 0) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'assistant', content: [{ kind: 'text', text: i18n.t('ai.cancelled') }] },
    ]);
    convoRef.current.push({
      role: 'user',
      content: [{ kind: 'text', text: 'Ik heb de voorgestelde wijzigingen geannuleerd; maak ze niet aan.' }],
    });
    setPendingChanges([]);
  }, [pendingChanges]);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      messages,
      isStreaming,
      pendingChanges,
      sendText,
      confirmChanges,
      cancelChanges,
      abort,
      clear,
    }),
    [
      isOpen,
      open,
      close,
      toggle,
      messages,
      isStreaming,
      pendingChanges,
      sendText,
      confirmChanges,
      cancelChanges,
      abort,
      clear,
    ],
  );

  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>;
};

export const useAIAssistant = (): AIAssistantContextValue => {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) throw new Error('useAIAssistant moet binnen AIAssistantProvider gebruikt worden');
  return ctx;
};

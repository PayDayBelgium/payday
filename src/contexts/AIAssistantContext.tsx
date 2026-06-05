// src/contexts/AIAssistantContext.tsx
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '../hooks/useAppSelector';
import { selectCurrentLevel } from '../store/slices/userProgressSlice';
import { loadAIConfig } from '../services/ai/config';
import { createProvider } from '../services/ai/providers';
import { buildSystemPrompt } from '../services/ai/systemPrompt';
import { textMessage, type AIMessage } from '../services/ai/types';
import i18n from '../i18n/config';

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
  sendText: (text: string) => Promise<void>;
  abort: () => void;
  clear: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextValue | null>(null);

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

export const AIAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const userLevel = useAppSelector(selectCurrentLevel);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const clear = useCallback(() => setMessages([]), []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: ChatMessage = { id: nextId(), ...textMessage('user', trimmed) };
      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: [{ kind: 'text', text: '' }],
        pending: true,
      };
      // Geschiedenis voor de provider (zonder het lege antwoord).
      const history: AIMessage[] = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const setAssistant = (updater: (prevText: string) => Partial<ChatMessage>) =>
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantMsg.id) return m;
            const prevText = m.content[0]?.kind === 'text' ? m.content[0].text : '';
            return { ...m, ...updater(prevText) };
          }),
        );

      try {
        const provider = createProvider(loadAIConfig());
        const system = buildSystemPrompt({ userLevel });
        const model = loadAIConfig().model;

        for await (const event of provider.streamChat({
          system,
          model,
          messages: history,
          signal: controller.signal,
        })) {
          if (event.type === 'text_delta') {
            setAssistant((prevText) => ({ content: [{ kind: 'text', text: prevText + event.text }] }));
          } else if (event.type === 'error') {
            setAssistant(() => ({ pending: false, error: event.message }));
          } else if (event.type === 'done') {
            setAssistant(() => ({ pending: false }));
          }
        }
      } catch (err) {
        const code = err instanceof Error ? err.message : 'ERROR';
        const msg =
          code === 'NO_API_KEY'
            ? i18n.t('ai.noKeyError')
            : code === 'PROVIDER_NOT_AVAILABLE'
              ? i18n.t('ai.providerUnavailable')
              : code;
        setAssistant(() => ({ pending: false, error: msg }));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, userLevel],
  );

  const value = useMemo(
    () => ({ isOpen, open, close, toggle, messages, isStreaming, sendText, abort, clear }),
    [isOpen, open, close, toggle, messages, isStreaming, sendText, abort, clear],
  );

  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>;
};

export const useAIAssistant = (): AIAssistantContextValue => {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) throw new Error('useAIAssistant moet binnen AIAssistantProvider gebruikt worden');
  return ctx;
};

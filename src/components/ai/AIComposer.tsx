// src/components/ai/AIComposer.tsx
import React, { useRef, useState } from 'react';
import { Send, Square, ImagePlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAIAssistant, type ImageAttachment } from '../../contexts/AIAssistantContext';

// Leest een afbeeldingsbestand in als base64 (zonder de data:-prefix).
const fileToAttachment = (file: File): Promise<ImageAttachment> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve({ mediaType: file.type || 'image/png', dataBase64: result.slice(comma + 1) });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const AIComposer: React.FC = () => {
  const { sendText, isStreaming, abort } = useAIAssistant();
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    const added = await Promise.all(imgs.map(fileToAttachment));
    setAttachments((prev) => [...prev, ...added]);
  };

  const canSend = value.trim() !== '' || attachments.length > 0;

  const submit = () => {
    if (!canSend) return;
    const text = value;
    const imgs = attachments;
    setValue('');
    setAttachments([]);
    void sendText(text, imgs);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) submit();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith('image/'))) {
      e.preventDefault();
      void addFiles(files);
    }
  };

  return (
    <div className="border-t border-ink-200 dark:border-trading-dark-600 p-3">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative">
              <img
                src={`data:${att.mediaType};base64,${att.dataBase64}`}
                alt=""
                className="h-16 w-16 object-cover rounded-md border border-ink-200 dark:border-trading-dark-600"
              />
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                aria-label={t('common.delete')}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-ink-700 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label={t('ai.attach')}
          title={t('ai.attach')}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-ink-200 dark:border-trading-dark-600 text-ink-600 dark:text-ink-300 hover:bg-surface-subtle dark:hover:bg-trading-dark-700"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={1}
          placeholder={t('ai.inputPlaceholder')}
          className="flex-1 resize-none rounded-lg border border-ink-200 dark:border-trading-dark-600 bg-white dark:bg-trading-dark-800 px-3 py-2 text-sm text-ink-800 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-primary-500 max-h-32"
        />
        {isStreaming ? (
          <button
            onClick={abort}
            aria-label={t('ai.stop')}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-negative-600 hover:bg-negative-700 text-white"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!canSend}
            aria-label={t('ai.send')}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary-700 hover:bg-primary-800 text-white disabled:bg-ink-300"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

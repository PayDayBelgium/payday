import React, { useState } from 'react';
import type { CommunityReply } from '../../types';

export const ReplyThread: React.FC<{
  replies: CommunityReply[];
  onReply: (text: string) => void;
}> = ({ replies, onReply }) => {
  const [text, setText] = useState('');
  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onReply(trimmed);
    setText('');
  };
  return (
    <div className="mt-3 space-y-2">
      {replies.map((r) => (
        <div key={r.id} className="flex gap-2 pl-3 border-l-2 border-[var(--line-soft)]">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: r.author.color }}
          >
            {r.author.initials}
          </div>
          <div>
            <span className="font-semibold text-xs text-ink-900 dark:text-white">
              {r.author.name}
            </span>
            <p className="text-xs text-ink-600 dark:text-ink-300 leading-snug">{r.text}</p>
          </div>
        </div>
      ))}
      <div className="flex gap-2 pl-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Reageer…"
          className="flex-1 bg-surface-subtle dark:bg-trading-dark-700 rounded-md px-2.5 py-1.5 text-xs outline-none text-ink-700 dark:text-ink-200 placeholder:text-ink-400"
        />
      </div>
    </div>
  );
};

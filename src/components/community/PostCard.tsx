import React, { useState } from 'react';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import type { CommunityPost, TradeIdea } from '../../types';
import { LevelBadge } from './LevelBadge';
import { TradeIdeaCard } from './TradeIdeaCard';
import { ReplyThread } from './ReplyThread';

export const PostCard: React.FC<{
  post: CommunityPost;
  onLike: () => void;
  onReply: (text: string) => void;
  onPlaceTrade?: (idea: TradeIdea) => void;
}> = ({ post, onLike, onReply, onPlaceTrade }) => {
  const [showReplies, setShowReplies] = useState(false);
  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
          style={{ background: post.author.color }}
        >
          {post.author.initials}
        </div>
        <div>
          <div className="font-semibold text-sm text-ink-900 dark:text-white">
            {post.author.name}
          </div>
          <div className="text-[11px] text-ink-400">
            {new Date(post.createdAt).toLocaleDateString('nl-BE')}
          </div>
        </div>
        <LevelBadge level={post.author.level} className="ml-auto" />
      </div>

      <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed my-2.5">{post.text}</p>

      {post.tradeIdea && <TradeIdeaCard idea={post.tradeIdea} onPlaceTrade={onPlaceTrade} />}

      <div className="flex items-center gap-4 mt-2.5 text-xs text-ink-500">
        <button
          onClick={onLike}
          className={`inline-flex items-center gap-1.5 ${post.likedByMe ? 'text-primary-700 font-semibold' : ''}`}
        >
          <ThumbsUp className="w-3.5 h-3.5" /> {post.likes}
        </button>
        <button
          onClick={() => setShowReplies((v) => !v)}
          className="inline-flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" /> {post.replies.length} reacties
        </button>
      </div>

      {showReplies && <ReplyThread replies={post.replies} onReply={onReply} />}
    </div>
  );
};

import React from 'react';
import { MessageSquare, ArrowRight, ThumbsUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectRecentPosts } from '../../store/slices/communitySlice';

export const CommunityWidget: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const posts = useAppSelector(selectRecentPosts(4));

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center">
          <MessageSquare className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </div>
        <div>
          <p className="eyebrow">{t('widgetsB.conversations')}</p>
          <h2 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">
            {t('widgetsB.community')}
          </h2>
        </div>
        <button
          onClick={() => navigate('/community')}
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary-700"
        >
          {t('widgetsB.toTheCommunity')} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-[var(--line-soft)]">
        {posts.map((post) => (
          <div key={post.id} className="flex gap-2.5 py-2.5 first:pt-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: post.author.color }}
            >
              {post.author.initials}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-xs text-ink-900 dark:text-white">
                {post.author.name}
              </span>
              <p className="text-xs text-ink-600 dark:text-ink-300 leading-snug truncate">
                {post.text}
              </p>
              <div className="text-[10px] text-ink-400 mt-0.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {post.likes}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {post.replies.length}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

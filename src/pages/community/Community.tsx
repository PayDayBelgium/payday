import React, { useState, useEffect } from 'react';
import { Beer } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { selectPostsByChannel, toggleLike } from '../../store/slices/communitySlice';
import { submitPost, submitReply } from '../../store/actions/communityActions';
import { isFeatureAvailable, selectUnlockedLevels } from '../../store/slices/userProgressSlice';
import { PostCard, Composer, useTradeIdeaWizard } from '../../components/community';
import type { CommunityAuthor, CommunityChannel } from '../../types';

// De ingelogde gebruiker als community-auteur (mock; geen echte profielen).
const ME: CommunityAuthor = { name: 'Jij', initials: 'JIJ', color: '#2F6CAE', level: 'beginner' };

const CHANNELS: { id: CommunityChannel; label: string }[] = [
  { id: 'ideas', label: 'Trading ideas' },
  { id: 'general', label: 'Algemeen' },
  { id: 'quant', label: 'Off-piste · Quant' },
];

export const Community: React.FC = () => {
  const dispatch = useAppDispatch();
  const { setPageTitle } = usePageTitle();
  const [channel, setChannel] = useState<CommunityChannel>('ideas');
  const unlocked = useAppSelector(selectUnlockedLevels);
  const quantUnlocked = isFeatureAvailable('quant_trading', unlocked);
  const posts = useAppSelector(selectPostsByChannel(channel));
  const { launch, wizard } = useTradeIdeaWizard();

  useEffect(() => {
    setPageTitle('Community', 'Après-ski bar · trading ideas & gesprekken');
  }, [setPageTitle]);

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Hero */}
      <div className="flex items-center gap-3 rounded-xl border border-caution-500/40 bg-caution-50 dark:bg-caution-600/10 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-caution-500 text-white flex items-center justify-center">
          <Beer className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <p className="eyebrow text-caution-600">Après-ski bar</p>
          <h1 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">Community</h1>
        </div>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-1.5">
        {CHANNELS.map((c) => {
          const locked = c.id === 'quant' && !quantUnlocked;
          return (
            <button
              key={c.id}
              disabled={locked}
              onClick={() => setChannel(c.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                channel === c.id
                  ? 'bg-primary-700 text-white border-primary-700 font-semibold'
                  : 'bg-white dark:bg-trading-dark-800 text-ink-500 border-[var(--line)]'
              } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {c.label}{locked ? ' 🔒' : ''}
            </button>
          );
        })}
      </div>

      {/* Composer */}
      <Composer
        initials={ME.initials}
        color={ME.color}
        onSubmit={(text) => dispatch(submitPost({ author: ME, channel, text }))}
      />

      {/* Feed */}
      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={() => dispatch(toggleLike(post.id))}
            onReply={(text) => dispatch(submitReply({ postId: post.id, author: ME, text }))}
            onPlaceTrade={post.tradeIdea ? launch : undefined}
          />
        ))}
        {posts.length === 0 && (
          <p className="text-sm text-ink-400 text-center py-8">Nog geen berichten in dit kanaal.</p>
        )}
      </div>

      {wizard}
    </div>
  );
};

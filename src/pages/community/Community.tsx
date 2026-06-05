import React, { useState, useEffect } from 'react';
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
    setPageTitle('Community', 'Trading ideas & gesprekken');
  }, [setPageTitle]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-[var(--line)] pb-4">
        <p className="eyebrow mb-1">Community</p>
        <h1 className="text-xl font-semibold text-ink-900 dark:text-white tracking-tight">Trading ideas &amp; gesprekken</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Deel ideeën, stel vragen en leer van andere PayDay-traders.</p>
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

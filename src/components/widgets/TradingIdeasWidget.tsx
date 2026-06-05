import React from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectFeaturedTradeIdeas } from '../../store/slices/communitySlice';
import { TradeIdeaCard, LevelBadge, useTradeIdeaWizard } from '../community';

export const TradingIdeasWidget: React.FC = () => {
  const navigate = useNavigate();
  const ideas = useAppSelector(selectFeaturedTradeIdeas(2));
  const { launch, wizard } = useTradeIdeaWizard();

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center">
          <Lightbulb className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </div>
        <div>
          <p className="eyebrow">Markt</p>
          <h2 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">Trading ideas</h2>
        </div>
        <button onClick={() => navigate('/community')} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
          Bekijk alle <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {ideas.map((post) => (
          <div key={post.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-ink-500">{post.author.name}</span>
              <LevelBadge level={post.author.level} className="ml-auto" />
            </div>
            <TradeIdeaCard idea={post.tradeIdea!} onPlaceTrade={launch} />
          </div>
        ))}
        {ideas.length === 0 && <p className="text-sm text-ink-400">Nog geen trading ideas.</p>}
      </div>
      {wizard}
    </div>
  );
};

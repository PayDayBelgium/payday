import React from 'react';
import { getLevelConfig } from '../../store/slices/userProgressSlice';
import type { UserLevel } from '../../types';

const TONE: Record<string, string> = {
  green: 'bg-positive-50 text-positive-700',
  blue: 'bg-primary-50 text-primary-700',
  red: 'bg-negative-50 text-negative-600',
  black: 'bg-ink-100 text-ink-700',
  orange: 'bg-caution-50 text-caution-600',
};

export const LevelBadge: React.FC<{ level: UserLevel; className?: string }> = ({
  level,
  className = '',
}) => {
  const config = getLevelConfig(level);
  const tone = TONE[config.slopeColor] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${tone} ${className}`}
    >
      <span>{config.icon}</span>
      <span>{config.slopeName}</span>
    </span>
  );
};

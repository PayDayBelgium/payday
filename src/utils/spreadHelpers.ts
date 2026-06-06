import type { Position } from '../types';

/**
 * Helper functions for spread detection and management
 */

/**
 * Extract spread ID from position notes
 * @param position - The position to check
 * @returns The spread ID if found, null otherwise
 */
export const getSpreadId = (position: Position): string | null => {
  if (!position.notes) return null;
  const match = position.notes.match(/Spread ID: (spread-\d+)/);
  return match ? match[1] : null;
};

/**
 * Check if a position is part of a spread
 * @param position - The position to check
 * @returns True if the position is part of a spread
 */
export const isSpreadLeg = (position: Position): boolean => {
  return getSpreadId(position) !== null;
};

/**
 * Group positions by spread ID
 * @param positions - Array of positions to group
 * @returns Map of spread ID to array of positions
 */
export const groupPositionsBySpread = (positions: Position[]): Map<string, Position[]> => {
  const spreadGroups = new Map<string, Position[]>();

  positions.forEach((position) => {
    const spreadId = getSpreadId(position);
    if (spreadId) {
      if (!spreadGroups.has(spreadId)) {
        spreadGroups.set(spreadId, []);
      }
      spreadGroups.get(spreadId)!.push(position);
    }
  });

  return spreadGroups;
};

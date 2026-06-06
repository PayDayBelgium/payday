// Shared Tailwind grid-template column definitions for position rows.
// These constants eliminate the duplicated magic grid-cols literals that
// were previously copied verbatim in multiple places.

// Full 12-column variant (including the extra _16px_130px columns for the
// expand indicator and the "Aangepast" (modified) date).
export const POSITION_GRID_COLS =
  'grid-cols-[32px_minmax(140px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px_16px_130px]';

// Compact 10-column variant (without the trailing _16px_130px columns).
export const POSITION_GRID_COLS_COMPACT =
  'grid-cols-[32px_minmax(140px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px]';

// Variant for indented sub-items: extra 16px spacer at the front and a
// narrower ticker column (minmax(124px,...)) instead of minmax(140px,...).
export const POSITION_GRID_COLS_SUBITEM =
  'grid-cols-[16px_32px_minmax(124px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px_16px_130px]';

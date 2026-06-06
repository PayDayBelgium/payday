// Gedeelde Tailwind grid-template kolomdefinities voor positie-rijen.
// Deze constanten elimineren de gedupliceerde magic grid-cols-literals die
// eerder op meerdere plaatsen letterlijk waren overgenomen.

// Volledige 12-koloms variant (inclusief de extra _16px_130px kolommen voor
// expand-indicator en de "Aangepast"-datum).
export const POSITION_GRID_COLS =
  'grid-cols-[32px_minmax(140px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px_16px_130px]';

// Compacte 10-koloms variant (zonder de laatste _16px_130px kolommen).
export const POSITION_GRID_COLS_COMPACT =
  'grid-cols-[32px_minmax(140px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px]';

// Variant voor ingesprongen sub-items: extra 16px-spacer vooraan en een
// smallere ticker-kolom (minmax(124px,...)) in plaats van minmax(140px,...).
export const POSITION_GRID_COLS_SUBITEM =
  'grid-cols-[16px_32px_minmax(124px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px_16px_130px]';

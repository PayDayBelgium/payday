/*
 * Codemod: replace Tailwind default `gray-*` utility classes with the project's
 * semantic design tokens (ink / surface / trading-dark / line) defined in
 * tailwind.config.js. The mapping is brightness-preserving (same lightness, only
 * the intended slight blue cast is added), so the visual change is subtle.
 *
 * Usage:
 *   node scripts/gray-to-tokens.cjs --dry      # preview counts, change nothing
 *   node scripts/gray-to-tokens.cjs            # apply in place
 *
 * Only touches src/**, skips locales + heavy config data (same as .prettierignore).
 */
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(__dirname, '..', 'src');
const SKIP = [
  path.join('src', 'i18n', 'locales'),
  path.join('src', 'config', 'educationCurriculum.ts'),
  path.join('src', 'config', 'learningResources.ts'),
];

// Ordered, specific mapping. Keys are matched with a class-boundary regex so
// `bg-gray-50` never partially matches inside another token. Variants like
// `dark:`, `hover:`, `group-hover:`, `focus:` are handled by matching the
// class fragment after any `prefix:` chain.
const MAP = {
  // Text — ink scale tracks gray lightness 1:1
  'text-gray-900': 'text-ink-900',
  'text-gray-800': 'text-ink-800',
  'text-gray-700': 'text-ink-700',
  'text-gray-600': 'text-ink-600',
  'text-gray-500': 'text-ink-500',
  'text-gray-400': 'text-ink-400',
  'text-gray-300': 'text-ink-300',
  'text-gray-200': 'text-ink-200',
  'text-gray-100': 'text-ink-100',
  'placeholder-gray-400': 'placeholder-ink-400',
  'placeholder-gray-500': 'placeholder-ink-500',
  // Light backgrounds — paper-blue surfaces
  'bg-gray-50': 'bg-surface',
  'bg-gray-100': 'bg-surface-subtle',
  'bg-gray-200': 'bg-surface-muted',
  'bg-gray-250': 'bg-surface-muted',
  // Mid greys (disabled states, separators) — ink scale
  'bg-gray-300': 'bg-ink-200',
  'bg-gray-400': 'bg-ink-300',
  'bg-gray-500': 'bg-ink-400',
  // Dark backgrounds — trading surfaces
  'bg-gray-600': 'bg-trading-dark-600',
  'bg-gray-700': 'bg-trading-dark-700',
  'bg-gray-750': 'bg-trading-dark-700',
  'bg-gray-800': 'bg-trading-dark-800',
  'bg-gray-900': 'bg-trading-dark-900',
  'bg-gray-950': 'bg-trading-dark-900',
  // Borders / divides / rings
  'border-gray-100': 'border-surface-subtle',
  'border-gray-200': 'border-surface-line',
  'border-gray-300': 'border-ink-200',
  'border-gray-400': 'border-ink-300',
  'border-gray-500': 'border-ink-400',
  'border-gray-600': 'border-trading-dark-500',
  'border-gray-700': 'border-trading-dark-600',
  'border-gray-900': 'border-trading-dark-900',
  'divide-gray-200': 'divide-surface-line',
  'divide-gray-700': 'divide-trading-dark-600',
  'ring-gray-200': 'ring-surface-line',
  'ring-gray-300': 'ring-ink-200',
  // Gradients
  'from-gray-50': 'from-surface',
  'from-gray-100': 'from-surface-subtle',
  'from-gray-700': 'from-trading-dark-600',
  'from-gray-800': 'from-trading-dark-800',
  'from-gray-900': 'from-trading-dark-900',
  'to-gray-100': 'to-surface-subtle',
  'to-gray-200': 'to-surface-muted',
  'to-gray-600': 'to-trading-dark-600',
  'to-gray-750': 'to-trading-dark-700',
  'to-gray-800': 'to-trading-dark-800',
  'to-gray-900': 'to-trading-dark-900',
};

// Build one regex per source class that matches the class token after any
// `word:` variant prefixes and at a class boundary (start/space/quote/backtick).
// Matches the class after any `variant:` prefixes and preserves an optional
// `/opacity` suffix (e.g. dark:bg-gray-700/50 -> dark:bg-trading-dark-700/50).
const rules = Object.entries(MAP).map(([from, to]) => ({
  from,
  to,
  re: new RegExp(`(^|[\\s"'\`])((?:[a-z-]+:)*)${from}(/\\d+)?(?=$|[\\s"'\`/])`, 'g'),
}));

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(path.resolve(__dirname, '..'), full);
    if (SKIP.some((s) => rel.startsWith(s))) continue;
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(full);
  }
})(ROOT);

let changedFiles = 0;
let totalReplacements = 0;
for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  let count = 0;
  for (const { to, re } of rules) {
    src = src.replace(re, (_m, pre, variants, opacity) => {
      count++;
      return `${pre}${variants}${to}${opacity || ''}`;
    });
  }
  if (count > 0) {
    changedFiles++;
    totalReplacements += count;
    if (!DRY) fs.writeFileSync(file, src);
  }
}

console.log(
  `${DRY ? '[dry-run] ' : ''}files touched: ${changedFiles} / ${files.length}, replacements: ${totalReplacements}`
);

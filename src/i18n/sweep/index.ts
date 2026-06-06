// Aggregates the i18n-sweep fragments (one per area) into per-locale objects
// that the main locale files spread in. Each fragment owns a top-level
// namespace so there are no key collisions. Add new fragments here as the
// sweep progresses.
import { stratPages } from './stratPages';
import { toolsPages } from './toolsPages';
import { modalsA } from './modalsA';
import { widgetsA } from './widgetsA';
import { pagesA } from './pagesA';

export const sweepEn = {
  stratPages: stratPages.en,
  toolsPages: toolsPages.en,
  modalsA: modalsA.en,
  widgetsA: widgetsA.en,
  pagesA: pagesA.en,
};

export const sweepNl = {
  stratPages: stratPages.nl,
  toolsPages: toolsPages.nl,
  modalsA: modalsA.nl,
  widgetsA: widgetsA.nl,
  pagesA: pagesA.nl,
};

export const sweepFr = {
  stratPages: stratPages.fr,
  toolsPages: toolsPages.fr,
  modalsA: modalsA.fr,
  widgetsA: widgetsA.fr,
  pagesA: pagesA.fr,
};

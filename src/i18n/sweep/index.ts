// Aggregates the i18n-sweep fragments (one per area) into per-locale objects
// that the main locale files spread in. Each fragment owns a top-level
// namespace so there are no key collisions. Add new fragments here as the
// sweep progresses.
import { stratPages } from './stratPages';
import { toolsPages } from './toolsPages';
import { modalsA } from './modalsA';
import { widgetsA } from './widgetsA';
import { pagesA } from './pagesA';
import { modalsB } from './modalsB';
import { widgetsB } from './widgetsB';
import { pagesB } from './pagesB';
import { compCommon } from './compCommon';
import { learnFeat } from './learnFeat';
import { sidebarExtra } from './sidebarExtra';

export const sweepEn = {
  stratPages: stratPages.en,
  toolsPages: toolsPages.en,
  modalsA: modalsA.en,
  // Several fragments wrap their keys in an extra self-named level; unwrap it.
  widgetsA: widgetsA.en.widgetsA,
  pagesA: pagesA.en.pagesA,
  modalsB: modalsB.en,
  widgetsB: widgetsB.en.widgetsB,
  pagesB: pagesB.en.pagesB,
  compCommon: compCommon.en.compCommon,
  learnFeat: learnFeat.en,
  sidebarExtra: sidebarExtra.en,
};

export const sweepNl = {
  stratPages: stratPages.nl,
  toolsPages: toolsPages.nl,
  modalsA: modalsA.nl,
  widgetsA: widgetsA.nl.widgetsA,
  pagesA: pagesA.nl.pagesA,
  modalsB: modalsB.nl,
  widgetsB: widgetsB.nl.widgetsB,
  pagesB: pagesB.nl.pagesB,
  compCommon: compCommon.nl.compCommon,
  learnFeat: learnFeat.nl,
  sidebarExtra: sidebarExtra.nl,
};

export const sweepFr = {
  stratPages: stratPages.fr,
  toolsPages: toolsPages.fr,
  modalsA: modalsA.fr,
  widgetsA: widgetsA.fr.widgetsA,
  pagesA: pagesA.fr.pagesA,
  modalsB: modalsB.fr,
  widgetsB: widgetsB.fr.widgetsB,
  pagesB: pagesB.fr.pagesB,
  compCommon: compCommon.fr.compCommon,
  learnFeat: learnFeat.fr,
  sidebarExtra: sidebarExtra.fr,
};

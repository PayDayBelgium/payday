# Gegroepeerde aandelen-tree op de portfolio-pagina

**Datum:** 2026-05-31
**Status:** Goedgekeurd ontwerp — klaar voor implementatieplan

## Probleem

Op de portfolio-pagina (`PortfolioDetail` → `PortfolioView`) worden aandelen/ETF's
getoond als **losse rijen per aankoop**. Koop je 80 + 20 Tesla, dan zie je twee aparte
TSLA-rijen. De gebruiker wil ze als één **uitklapbare groep** (tree-style) zien, met de
**gemiddelde aankoopkoers (GAK)** in de groep-header, zodat hij beter kan beslissen op
welke prijs hij zijn covered call zet.

## Doel

Toon de aandelen/ETF-posities op de portfolio-pagina als per-ticker gegroepeerde,
uitklapbare boom met GAK in de header — door het **bestaande** `GroupedStockList`-component
(dat dit al doet op de Stocks/ETFs-strategiepagina) te hergebruiken in `PortfolioView`.

## Bestaande situatie (geverifieerd)

- **Portfolio-pagina:** `src/pages/portfolios/PortfolioDetail.tsx` rendert `PortfolioView`
  in de "portfolio"-tab.
- **`PortfolioView.tsx`:** groepeert posities per *strategie* (`groupedAllPositions`).
  Binnen elke strategie-sectie rendert het `strategyStandalonePositions.map(...)`
  (rond regel 2224): aandelen/ETF's als `StockRow` (regel ~2263), opties als `OptionRow`.
  Aandelen/ETF's vallen onder de strategie-sectie "Aandelen en ETFs". Er is een
  uitgeschakeld oud tree-blok (`{false && groupedPositions.map(...)}` rond regel 1360).
- **`GroupedStockList.tsx`:** volledig uitklapbaar tree-component per ticker met
  chevron, GAK (`averageCost`), per-lot details, "CC mogelijk"-badge, inline
  prijs-bewerken en een ticker-niveau "S"-verkoopknop (eigen `SellStockModal`). Lot
  aanklikken roept `onEditPosition(position)` aan. Wordt nu alleen gebruikt in
  `StocksETFsStrategy.tsx`.
- **`Holding`-infrastructuur:** `groupHoldings` / `selectHoldingsByPortfolio` (met
  `averageCost`, `lots`, `totalShares`, CC-capaciteit) bestaat al. `GroupedStockList`
  berekent zijn eigen GAK inline; het hoeft de selector niet per se te gebruiken.

## Aanpak

Hergebruik `GroupedStockList` in `PortfolioView`. Geen nieuw component, geen nieuw
datamodel.

### Wat verandert
1. In `PortfolioView` worden **alle open aandelen/ETF-posities** van het portfolio uit de
   per-strategie `StockRow`-rendering gehaald, zodat ze daar niet meer als losse rijen
   verschijnen (en niet dubbel getoond worden).
2. Op de plek van de "Aandelen en ETFs"-sectie wordt **één `GroupedStockList`** gerenderd
   met die aandelen/ETF-lots.
3. Opties en spreads blijven **ongewijzigd** in hun huidige rij-stijl, inclusief hun
   bestaande alert/opportunity-bedrading.

### Prop-bedrading (uit bestaande bronnen)
`GroupedStockList` props (zie `GroupedStockListProps`):

| Prop | Bron in PortfolioView |
|---|---|
| `positions: StockPosition[]` | open stock/etf-posities van dit portfolio (al in scope via `positions`) |
| `allPortfolios: Portfolio[]` | `selectPortfolios` uit de store |
| `alerts: PriceAlert[]` | bestaande prijs-alerts (`selectPriceAlerts` / reeds beschikbaar) |
| `onEditPosition: (p) => void` | gekoppeld aan de bestaande detail/bekijk-actie (`setPositionToView`) |
| `strategyAlertsMap?` | optioneel: map van `positionOpportunities` → `StrategyAlert[]` zodat de CC-opportunity zichtbaar is |
| `onDismissStrategyAlert?` | optioneel; mag weggelaten worden |

### Geaccepteerde gedragsverschillen (gevolg van hergebruik)
- Verkopen gebeurt op **ticker-niveau** via de ingebouwde "S"-knop (`SellStockModal` in
  `GroupedStockList`), niet per los lot.
- Een lot aanklikken opent **bewerken** (`onEditPosition`); inline prijs-bewerken in de
  header komt mee.

Beide zijn door de gebruiker goedgekeurd.

## Componenten & verantwoordelijkheden

- `PortfolioView.tsx` — orkestreert de portfolio-lijst; levert nu de aandelen/ETF's aan
  `GroupedStockList` i.p.v. ze als losse `StockRow`'s te renderen. Verantwoordelijk voor:
  uitsluiten van stock/etf uit de per-strategie standalone-rendering, en het plaatsen +
  bedraden van `GroupedStockList`.
- `GroupedStockList.tsx` — ongewijzigd hergebruikt; levert de tree, GAK-header, per-lot
  details, CC-badge, verkoop- en bewerk-acties.

## Edge cases

- **Geen aandelen/ETF's:** `GroupedStockList` toont zijn eigen lege staat / niets; de
  sectie mag verborgen worden als er geen aandelen zijn (volg bestaande sectie-conditie).
- **Aandelen verspreid over meerdere "strategie"-secties:** alle open stock/etf-posities
  van het portfolio worden centraal verzameld en éénmaal via `GroupedStockList`
  weergegeven, niet per strategie-sectie — zo voorkomen we dubbele weergave.
- **Opties die naar dezelfde ticker verwijzen:** blijven in hun eigen opties-rendering;
  alleen `type === 'stock' | 'etf'` gaat naar `GroupedStockList`.
- **Filters/zoeken op de portfolio-pagina:** als `PortfolioView` een expiratie/zoekfilter
  heeft dat aandelen beïnvloedt, blijft het gedrag voor aandelen zoals `GroupedStockList`
  het biedt (eigen zoekbalk). Bestaande filters voor opties blijven werken.

## Verificatie

Geen nieuwe geldlogica — de groepering, GAK en CC-badge bestaan al in
`groupHoldings`/`GroupedStockList` en zijn gedekt door bestaande unit-tests. Verificatie is
daarom vooral visueel/integratie:

- **Visueel (Playwright/handmatig):** koop 80 + 20 TSLA in een portfolio; open de
  portfolio-pagina; bevestig één uitklapbare TSLA-groep met GAK in de header en 80 + 20 bij
  uitklappen; bevestig dat opties/spreads onveranderd zijn en aandelen niet dubbel
  verschijnen; controleer dat de "S"-verkoopknop en lot-klik (bewerken) werken.
- **Type-check/build/lint:** `npx tsc -b`, `npm run build`, geen nieuwe lint-fouten in de
  gewijzigde bestanden.

## Buiten scope

- Wijzigingen aan `GroupedStockList` zelf (m.u.v. eventueel kleine prop-/typing-aanpassingen
  die nodig zijn voor de integratie).
- Wijzigingen aan de opties-/spreads-weergave.
- Het samenvoegen van losse aankooptransacties in het datamodel (blijft afgeleid/visueel).
- Een suggestie voor de CC-strike zelf — alleen de GAK wordt getoond als beslissingsbasis.

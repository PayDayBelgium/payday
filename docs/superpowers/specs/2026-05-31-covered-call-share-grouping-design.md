# Covered Calls op samengevoegde aandelenposities (per-ticker grouping)

**Datum:** 2026-05-31
**Status:** Goedgekeurd ontwerp — klaar voor implementatieplan

## Probleem

Elke aankoop van een aandeel wordt als een apart `StockPosition`-lot opgeslagen. Koop
je 80 + 20 aandelen Tesla, dan ontstaan twee lots (80 en 20). De software bepaalt of
je een covered call mag schrijven door **per los lot** te checken op `shares >= 100`.
Geen van beide lots haalt 100, dus de ticker valt weg uit de covered-call-wizard en de
gebruiker kan geen covered call schrijven — ook al bezit hij in totaal 100 aandelen.

Hetzelfde foute per-lot-patroon zit op ~8 plekken (wizard, lijst-badges,
strategie-filter, alert-engine, campaign-detector).

## Doel

Een **automatisch afgeleide groepering per ticker** (binnen één portfolio) waarop
covered-call-logica werkt. De losse aankopen blijven als transacties bestaan en blijven
uitklapbaar; ze worden "live" opgeteld tot het ticker-totaal. Er komt **geen** nieuwe
persistente entiteit en **geen** datamodel-migratie.

### Eligibility-regel

Een covered call vereist 100 **vrije** (ongedekte) aandelen — niet enkel 100 in bezit.
Bestaande, al-geschreven covered calls verlagen het aantal vrije aandelen.
**Spread-legs tellen niet mee**: de short-call van een spread is gedekt door zijn long
leg, niet door aandelen.

## Aanpak (gekozen: C — hybride)

Twee verantwoordelijkheden, gesplitst zodat zowel React-componenten (via een selector)
als niet-React-code (alert-engine, campaign-detector) dezelfde regel delen:

1. **Pure helper** voor de rekenregel.
2. **Gememoïseerde selector** die de gegroepeerde holdings levert en de helper gebruikt.

## Module 1 — pure helper

Nieuw bestand: `src/utils/coveredCallEligibility.ts`. Geen React, geen Redux.

Verantwoordelijkheid: gegeven de open posities van één portfolio + een ticker, bereken
de covered-call-capaciteit.

```ts
// Aandelen per contract voor deze ticker
sharesPerContract = miniContractsSupported ? 10 : 100

// Maximaal aantal covered calls dat het bezit toelaat
maxContracts = Math.floor(totalShares / sharesPerContract)

// Reeds geschreven covered calls voor deze ticker+portfolio:
//   open verkochte calls  (type 'call', action 'sell', status 'open')
//   van zelfde ticker+portfolio
//   die GEEN spread-leg zijn  ->  isSpreadLeg(call) === false
coveredContracts = som van contracts van die calls

freeContracts = maxContracts - coveredContracts
canWriteCoveredCall = optionsSupported && freeContracts >= 1
```

- `isSpreadLeg` komt uit de bestaande `src/utils/spreadHelpers.ts`.
- `sharesPerContract`, `optionsSupported` en `miniContractsSupported` worden van de
  ticker afgeleid (lots van dezelfde ticker zijn consistent).

## Module 2 — gememoïseerde selector

`selectHoldingsByPortfolio` in de bestaande positions-selectors/slice. Geeft per ticker
binnen een portfolio één **Holding** terug, afgeleid uit de open lots:

```ts
Holding = {
  ticker, name, type,
  lots: StockPosition[],            // de losse transacties (voor uitklappen)
  totalShares, totalCostBasis, averageCost, totalValue, profitLoss, profitLossPercentage,
  optionsSupported, miniContractsSupported,
  // eligibility-velden uit de pure helper:
  coveredContracts, maxContracts, freeContracts, canWriteCoveredCall
}
```

Deze selector **vervangt** de twee bestaande, gedupliceerde inline-groeperingen:
- `GroupedStockList.tsx` (regel ~66-113)
- `PortfolioView.tsx` (regel ~275-315)

zodat er nog maar één groeperingslogica is.

## Consistentie-sweep — call sites

Alle per-lot-checks gaan over op de gedeelde holding/helper:

| # | Bestand | Nu (fout) | Wordt |
|---|---------|-----------|-------|
| 1 | `CallOptionWizard.tsx:142-146` | `stock.shares >= 100` per lot (de blokkade) | ticker-holdings met `canWriteCoveredCall`; één keuze per ticker |
| 2 | `GroupedStockList.tsx:229-232` | `pos.shares` per lot voor CC-badge | `holding.canWriteCoveredCall` |
| 3 | `PortfolioView.tsx:407-422` | per-lot, telt sold calls incl. spreads | holding uit selector |
| 4 | `StocksETFsStrategy.tsx:157-158` | per-lot filter | holding-helper |
| 5 | `StockETFCard.tsx:44-46` | per-lot badge | eligibility doorgegeven vanaf de groep |
| 6 | `StockRow.tsx:53-56` | per-lot badge | eligibility doorgegeven vanaf de groep |
| 7 | `alertEvaluator.ts:327-353` | `floor(stock.shares/100)` per lot | per ticker aggregeren via helper |
| 8 | `campaignDetector.ts:112` | `stock.shares >= 100` per lot | helper |

Componenten die één los lot renderen (5, 6) krijgen de eligibility **van de groep
doorgegeven** in plaats van zelf te rekenen — een lot van 20 weet niet van de andere 80.

## UI-gedrag

- **Wizard (ticker-keuze):** elke in aanmerking komende ticker verschijnt **één keer**,
  gegroepeerd, met totaal aandelen en aantal vrije contracten
  (bijv. "TSLA — 100 aandelen · 1 vrij contract"). Na keuze geldt de covered call voor
  die ticker, net als nu (geen lot-koppeling; opgeslagen als verkochte call die op
  ticker matcht).
- **Wizard (aantal contracten):** begrensd op `freeContracts`, met een nette melding
  wanneer de gebruiker meer probeert in te voeren. Voorkomt per ongeluk naked calls.
- **Lijst:** uitklappen om de losse transacties (80 + 20) te zien blijft bestaan. De
  "CC mogelijk"-badge verschijnt zodra `freeContracts >= 1`.

## Edge cases

- **Mini contracts** (10 aandelen/contract): `sharesPerContract` van de ticker afgeleid.
- **Verkoop / assignment:** verlaagt het ticker-totaal → de afgeleide holding
  herberekent vanzelf; geen aparte actie nodig.
- **LEAPs (PMCC):** de aparte LEAP-route in de wizard (`eligibleLeaps`) blijft
  ongewijzigd — buiten scope.
- **Spreads:** short-call-legs van spreads tellen niet mee als covered call (via
  `isSpreadLeg`). Ze zijn gedekt door hun long leg, niet door aandelen.

## Verificatie

Er is nog geen testframework in dit project.

- **Vitest toevoegen** en de pure helper (`coveredCallEligibility.ts`) met unit-tests
  afdekken. Minimaal te dekken gevallen:
  - 80 + 20 = 100 aandelen → `maxContracts = 1`, `freeContracts = 1`,
    `canWriteCoveredCall = true`.
  - 250 aandelen met 1 actieve covered call → `maxContracts = 2`, `freeContracts = 1`.
  - 100 aandelen met 1 actieve covered call → `freeContracts = 0`,
    `canWriteCoveredCall = false`.
  - Een verkochte call die een spread-leg is → telt **niet** mee als covered call.
  - Alleen 80 aandelen → `maxContracts = 0`, `canWriteCoveredCall = false`.
  - Mini contracts: 20 aandelen, `miniContractsSupported` → `maxContracts = 2`.
- **Flow (Playwright, visueel):** dev-server starten; portfolio met opties; 80 + 20 TSLA
  kopen; wizard openen en bevestigen dat TSLA als onderliggende verschijnt en de covered
  call doorkomt; daarna checken dat een 2e covered call geblokkeerd wordt (0 vrij).

## Buiten scope

- Persistente "Holding"-entiteit of datamodel-migratie.
- Wijzigingen aan de LEAP/PMCC covered-call-route.
- Het daadwerkelijk samenvoegen van losse aankooptransacties tot één positie.

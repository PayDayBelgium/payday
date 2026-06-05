// src/services/ai/tools.ts
// Tooldefinities voor de agent + vertaling van tool-calls naar voorstellen,
// en het toepassen van bevestigde voorstellen op de Redux-store.
import type { RootState, AppDispatch } from '../../store';
import type {
  Portfolio,
  StockPosition,
  CallOption,
  PutOption,
  Ticker,
  PortfolioTransaction,
  CurrencyType,
} from '../../types';
import { addPortfolio, addTransaction } from '../../store/slices/portfoliosSlice';
import { addPosition } from '../../store/slices/positionsSlice';
import { addTicker } from '../../store/slices/tickersSlice';
import { selectPortfolios } from '../../store/slices/portfoliosSlice';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import type { ToolSchema } from './types';

// ---------------------------------------------------------------------------
// Tooldefinities (JSON-schema's) die naar het model gaan.
// ---------------------------------------------------------------------------
export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: 'get_portfolios',
    description:
      'Geeft de lijst van bestaande portefeuilles (naam, valuta, huidige waarde). Gebruik dit eerst om te zien wat er al bestaat en dubbele aanmaak te vermijden.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'propose_create_portfolio',
    description:
      'Stelt voor een nieuwe portefeuille (broker-account) aan te maken. Voert niets uit — de gebruiker bevestigt eerst. Roep dit alleen aan als de juiste portefeuille nog niet bestaat.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Naam van de portefeuille/broker' },
        currency: { type: 'string', enum: ['USD', 'EUR'], description: 'Valuta' },
        initialCapital: { type: 'number', description: 'Beschikbare cash / startkapitaal bij de broker' },
      },
      required: ['name', 'currency', 'initialCapital'],
    },
  },
  {
    name: 'propose_create_stock',
    description:
      'Stelt voor een aandelen- of ETF-positie aan te maken. Voert niets uit — de gebruiker bevestigt eerst.',
    input_schema: {
      type: 'object',
      properties: {
        portfolio: { type: 'string', description: 'Naam van de portefeuille waar de positie in komt' },
        ticker: { type: 'string', description: 'Ticker-symbool, bv. AAPL' },
        name: { type: 'string', description: 'Naam van het bedrijf/de ETF' },
        assetType: { type: 'string', enum: ['stock', 'etf'] },
        shares: { type: 'number', description: 'Aantal aandelen' },
        purchasePrice: { type: 'number', description: 'Aankoopprijs per aandeel' },
        openDate: { type: 'string', description: 'Aankoopdatum (YYYY-MM-DD). Laat weg als onbekend.' },
      },
      required: ['portfolio', 'ticker', 'name', 'assetType', 'shares', 'purchasePrice'],
    },
  },
  {
    name: 'propose_create_option',
    description:
      'Stelt voor een optiepositie (call of put) aan te maken. Voert niets uit — de gebruiker bevestigt eerst.',
    input_schema: {
      type: 'object',
      properties: {
        portfolio: { type: 'string', description: 'Naam van de portefeuille' },
        ticker: { type: 'string', description: 'Ticker-symbool van de onderliggende waarde' },
        optionType: { type: 'string', enum: ['call', 'put'] },
        action: { type: 'string', enum: ['buy', 'sell'], description: 'Gekocht of verkocht' },
        strike: { type: 'number' },
        expiration: { type: 'string', description: 'Expiratiedatum (YYYY-MM-DD)' },
        contracts: { type: 'number' },
        premium: { type: 'number', description: 'Premie per contract (per aandeel)' },
        openDate: { type: 'string', description: 'Openingsdatum (YYYY-MM-DD). Laat weg als onbekend.' },
      },
      required: ['portfolio', 'ticker', 'optionType', 'action', 'strike', 'expiration', 'contracts', 'premium'],
    },
  },
];

export const isReadTool = (name: string): boolean => name === 'get_portfolios';

// ---------------------------------------------------------------------------
// Voorgestelde wijzigingen (verzameld tot de gebruiker bevestigt).
// ---------------------------------------------------------------------------
export type ProposedChange =
  | { kind: 'portfolio'; toolUseId: string; name: string; currency: CurrencyType; initialCapital: number }
  | {
      kind: 'stock';
      toolUseId: string;
      portfolio: string;
      ticker: string;
      name: string;
      assetType: 'stock' | 'etf';
      shares: number;
      purchasePrice: number;
      openDate: string;
    }
  | {
      kind: 'option';
      toolUseId: string;
      portfolio: string;
      ticker: string;
      optionType: 'call' | 'put';
      action: 'buy' | 'sell';
      strike: number;
      expiration: string;
      contracts: number;
      premium: number;
      openDate: string;
    };

const today = (): string => new Date().toISOString().slice(0, 10);

const asNumber = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
};
const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.trim() !== '' ? v : fallback;

// Vertaalt een propose-tool-call naar een ProposedChange (of null bij read-tool/onbekend).
export const parseProposedChange = (
  name: string,
  input: unknown,
  toolUseId: string,
): ProposedChange | null => {
  const o = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case 'propose_create_portfolio':
      return {
        kind: 'portfolio',
        toolUseId,
        name: asString(o.name),
        currency: o.currency === 'EUR' ? 'EUR' : 'USD',
        initialCapital: asNumber(o.initialCapital),
      };
    case 'propose_create_stock':
      return {
        kind: 'stock',
        toolUseId,
        portfolio: asString(o.portfolio),
        ticker: asString(o.ticker).toUpperCase(),
        name: asString(o.name),
        assetType: o.assetType === 'etf' ? 'etf' : 'stock',
        shares: asNumber(o.shares),
        purchasePrice: asNumber(o.purchasePrice),
        openDate: asString(o.openDate, today()),
      };
    case 'propose_create_option':
      return {
        kind: 'option',
        toolUseId,
        portfolio: asString(o.portfolio),
        ticker: asString(o.ticker).toUpperCase(),
        optionType: o.optionType === 'put' ? 'put' : 'call',
        action: o.action === 'sell' ? 'sell' : 'buy',
        strike: asNumber(o.strike),
        expiration: asString(o.expiration),
        contracts: asNumber(o.contracts, 1),
        premium: asNumber(o.premium),
        openDate: asString(o.openDate, today()),
      };
    default:
      return null;
  }
};

// Korte, leesbare samenvatting van een voorstel voor de bevestigingskaart.
export const describeChange = (c: ProposedChange): string => {
  switch (c.kind) {
    case 'portfolio':
      return `Portefeuille "${c.name}" (${c.currency}, cash ${c.initialCapital})`;
    case 'stock':
      return `${c.assetType === 'etf' ? 'ETF' : 'Aandeel'} ${c.ticker}: ${c.shares} @ ${c.purchasePrice} → ${c.portfolio}`;
    case 'option':
      return `${c.action === 'buy' ? 'Long' : 'Short'} ${c.optionType.toUpperCase()} ${c.ticker} ${c.strike} exp ${c.expiration} ×${c.contracts} @ ${c.premium} → ${c.portfolio}`;
  }
};

// ---------------------------------------------------------------------------
// Read-tool uitvoeren.
// ---------------------------------------------------------------------------
export const executeReadTool = (name: string, getState: () => RootState): string => {
  if (name === 'get_portfolios') {
    const portfolios = selectPortfolios(getState()).map((p) => ({
      name: p.name,
      currency: p.currency,
      currentValue: p.currentValue,
    }));
    return JSON.stringify(portfolios);
  }
  return JSON.stringify({ error: 'Onbekende read-tool' });
};

// ---------------------------------------------------------------------------
// Bevestigde voorstellen toepassen op de store.
// ---------------------------------------------------------------------------
let seq = 0;
const uid = (prefix: string): string => `${prefix}-${Date.now()}-${++seq}`;

const portfolioCurrentValue = (getState: () => RootState, name: string): number =>
  selectPortfolios(getState()).find((p) => p.name === name)?.currentValue ?? 0;

const ensureTicker = (
  getState: () => RootState,
  dispatch: AppDispatch,
  symbol: string,
  name: string,
  type: 'stock' | 'etf',
  price: number,
): void => {
  const exists = selectAllTickers(getState()).some(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  if (exists) return;
  const ticker: Ticker = {
    symbol,
    name: name || symbol,
    type,
    optionsAvailable: true,
    miniContractsAvailable: false,
    lastUsed: new Date().toISOString(),
    currentPrice: price,
    createdAt: new Date().toISOString(),
  };
  dispatch(addTicker(ticker));
};

// Past één voorstel toe. Retourneert true bij succes.
const applyChange = (c: ProposedChange, getState: () => RootState, dispatch: AppDispatch): void => {
  if (c.kind === 'portfolio') {
    const portfolio: Portfolio = {
      id: uid('pf'),
      name: c.name,
      logo: '',
      pricePerContract: 100,
      strategy: '',
      hasOptions: true,
      strategies: [],
      currency: c.currency,
      startDate: today(),
      initialCapital: c.initialCapital,
      currentValue: c.initialCapital,
    };
    dispatch(addPortfolio(portfolio));
    return;
  }

  if (c.kind === 'stock') {
    ensureTicker(getState, dispatch, c.ticker, c.name, c.assetType, c.purchasePrice);
    const costBasis = c.shares * c.purchasePrice;
    const position: StockPosition = {
      id: uid('pos'),
      type: c.assetType,
      ticker: c.ticker,
      name: c.name,
      portfolio: c.portfolio,
      openDate: c.openDate,
      status: 'open',
      shares: c.shares,
      costBasis,
      purchasePrice: c.purchasePrice,
      currentPrice: c.purchasePrice,
      currentValue: costBasis,
      optionsSupported: true,
      miniContractsSupported: false,
    };
    dispatch(addPosition(position));
    const prev = portfolioCurrentValue(getState, c.portfolio);
    const txn: PortfolioTransaction = {
      id: uid('txn'),
      portfolio: c.portfolio,
      date: c.openDate,
      type: 'position_buy',
      amount: -costBasis,
      description: `Gekocht ${c.shares} ${c.ticker} @ ${c.purchasePrice}`,
      relatedPositionId: position.id,
      previousValue: prev,
      newValue: prev,
      createdAt: new Date().toISOString(),
    };
    dispatch(addTransaction(txn));
    return;
  }

  // option
  const total = c.premium * c.contracts * 100;
  const costBasis = c.action === 'buy' ? total : -total;
  const breakEven = c.optionType === 'call' ? c.strike + c.premium : c.strike - c.premium;
  const base = {
    id: uid('pos'),
    ticker: c.ticker,
    portfolio: c.portfolio,
    openDate: c.openDate,
    status: 'open' as const,
    action: c.action,
    strike: c.strike,
    expiration: c.expiration,
    contracts: c.contracts,
    premium: c.premium,
    costBasis,
    currentValue: costBasis,
    breakEven,
  };
  const position: CallOption | PutOption =
    c.optionType === 'call'
      ? { type: 'call', ...base }
      : {
          type: 'put',
          ...base,
          cashReserved: c.action === 'sell' ? c.strike * c.contracts * 100 : undefined,
        };
  dispatch(addPosition(position));
  const prev = portfolioCurrentValue(getState, c.portfolio);
  const txn: PortfolioTransaction = {
    id: uid('txn'),
    portfolio: c.portfolio,
    date: c.openDate,
    type: c.action === 'buy' ? 'premium_paid' : 'premium_collected',
    amount: c.action === 'buy' ? -total : total,
    description: `${c.action === 'buy' ? 'Long' : 'Short'} ${c.optionType.toUpperCase()} ${c.ticker} ${c.strike} ×${c.contracts}`,
    relatedPositionId: position.id,
    previousValue: prev,
    newValue: prev,
    createdAt: new Date().toISOString(),
  };
  dispatch(addTransaction(txn));
};

// Past alle voorstellen toe (portefeuilles eerst, zodat posities ernaar kunnen verwijzen).
export const applyChanges = (
  changes: ProposedChange[],
  getState: () => RootState,
  dispatch: AppDispatch,
): void => {
  const ordered = [...changes].sort((a, b) => (a.kind === 'portfolio' ? -1 : 0) - (b.kind === 'portfolio' ? -1 : 0));
  for (const c of ordered) applyChange(c, getState, dispatch);
};

// src/services/ai/tools.ts
// Tool definitions for the agent + translation of tool calls into proposals,
// and applying confirmed proposals to the Redux store.
import type { RootState, AppDispatch } from '../../store';
import type {
  Portfolio,
  StockPosition,
  CallOption,
  PutOption,
  Ticker,

  CurrencyType,
  UserLevel,
} from '../../types';
import { openPosition } from '../../store/commands/positionCommands';
import { createPortfolio as createPortfolioCmd } from '../../store/commands/portfolioCommands';
import { deposit as depositCmd } from '../../store/commands/cashCommands';
import { updateTickerPrice } from '../../store/slices/tickersSlice';
import { addTicker as addTickerCommand } from '../../store/commands/tickerCommands';
import { selectPortfolios } from '../../store/slices/portfoliosSlice';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { selectUnlockedLevels, isFeatureAvailable } from '../../store/slices/userProgressSlice';
import { getOptionActionFeature } from '../../utils/optionFeatureAccess';
import type { ToolSchema } from './types';
import PaydayLogo from '../../assets/app/logo.png';

// ---------------------------------------------------------------------------
// Tool definitions (JSON schemas) that are sent to the model.
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
      'Stelt voor een nieuwe portefeuille (broker-account) aan te maken. Voert niets uit — de gebruiker bevestigt eerst. Roep dit alleen aan als de juiste portefeuille nog niet bestaat. Geef de NOG BESCHIKBARE cash door (availableCash); het systeem berekent de totale storting automatisch als availableCash + de waarde van de posities die je in deze portefeuille aanmaakt.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Naam van de portefeuille/broker' },
        currency: { type: 'string', enum: ['USD', 'EUR'], description: 'Valuta' },
        availableCash: {
          type: 'number',
          description:
            'De nog beschikbare (niet-belegde) cash bij de broker, zoals op het scherm getoond.',
        },
      },
      required: ['name', 'currency', 'availableCash'],
    },
  },
  {
    name: 'propose_create_stock',
    description:
      'Stelt voor een aandelen- of ETF-positie aan te maken. Voert niets uit — de gebruiker bevestigt eerst.',
    input_schema: {
      type: 'object',
      properties: {
        portfolio: {
          type: 'string',
          description: 'Naam van de portefeuille waar de positie in komt',
        },
        ticker: { type: 'string', description: 'Ticker-symbool, bv. AAPL' },
        name: {
          type: 'string',
          description:
            'Naam van het bedrijf/de ETF. Vraag dit aan de gebruiker als je het niet kent.',
        },
        assetType: { type: 'string', enum: ['stock', 'etf'] },
        shares: { type: 'number', description: 'Aantal aandelen' },
        purchasePrice: { type: 'number', description: 'Aankoopprijs (open-prijs) per aandeel' },
        currentPrice: {
          type: 'number',
          description:
            'Huidige koers per aandeel, zoals op het scherm getoond. Laat weg als niet zichtbaar.',
        },
        openDate: {
          type: 'string',
          description: 'Aankoopdatum (YYYY-MM-DD). Laat weg als onbekend.',
        },
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
        tickerName: {
          type: 'string',
          description:
            'Naam van de onderliggende waarde. Vraag dit aan de gebruiker als je het niet kent.',
        },
        optionType: { type: 'string', enum: ['call', 'put'] },
        action: { type: 'string', enum: ['buy', 'sell'], description: 'Gekocht of verkocht' },
        strike: { type: 'number' },
        expiration: { type: 'string', description: 'Expiratiedatum (YYYY-MM-DD)' },
        contracts: { type: 'number' },
        premium: {
          type: 'number',
          description: 'Premie per contract bij opening (open-prijs/aankoopprijs)',
        },
        currentPremium: {
          type: 'number',
          description:
            'Huidige premie per contract (de "last price" / huidige koers van de optie), zoals op het scherm getoond. Laat weg als niet zichtbaar.',
        },
        openDate: {
          type: 'string',
          description: 'Openingsdatum (YYYY-MM-DD). Laat weg als onbekend.',
        },
      },
      required: [
        'portfolio',
        'ticker',
        'optionType',
        'action',
        'strike',
        'expiration',
        'contracts',
        'premium',
      ],
    },
  },
];

export const isReadTool = (name: string): boolean => name === 'get_portfolios';

// Default logo for automatically created portfolios: the PayDay logo,
// so the portfolio icon is never missing.
export const DEFAULT_PORTFOLIO_LOGO = PaydayLogo;

// ---------------------------------------------------------------------------
// Proposed changes (collected until the user confirms).
// ---------------------------------------------------------------------------
export type ProposedChange =
  | {
      kind: 'portfolio';
      toolUseId: string;
      name: string;
      currency: CurrencyType;
      availableCash: number;
    }
  | {
      kind: 'stock';
      toolUseId: string;
      portfolio: string;
      ticker: string;
      name: string;
      assetType: 'stock' | 'etf';
      shares: number;
      purchasePrice: number;
      currentPrice?: number;
      openDate: string;
    }
  | {
      kind: 'option';
      toolUseId: string;
      portfolio: string;
      ticker: string;
      tickerName?: string;
      optionType: 'call' | 'put';
      action: 'buy' | 'sell';
      strike: number;
      expiration: string;
      contracts: number;
      premium: number;
      currentPremium?: number;
      openDate: string;
    };

const today = (): string => new Date().toISOString().slice(0, 10);

const asNumber = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
};
const asOptionalNumber = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : undefined;
};
const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.trim() !== '' ? v : fallback;
const asOptionalString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined;

// Translates a propose tool call into a ProposedChange (or null for a read tool/unknown).
export const parseProposedChange = (
  name: string,
  input: unknown,
  toolUseId: string
): ProposedChange | null => {
  const o = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case 'propose_create_portfolio':
      return {
        kind: 'portfolio',
        toolUseId,
        name: asString(o.name),
        currency: o.currency === 'EUR' ? 'EUR' : 'USD',
        availableCash: asNumber(o.availableCash),
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
        currentPrice: asOptionalNumber(o.currentPrice),
        openDate: asString(o.openDate, today()),
      };
    case 'propose_create_option':
      return {
        kind: 'option',
        toolUseId,
        portfolio: asString(o.portfolio),
        ticker: asString(o.ticker).toUpperCase(),
        tickerName: asOptionalString(o.tickerName),
        optionType: o.optionType === 'put' ? 'put' : 'call',
        action: o.action === 'sell' ? 'sell' : 'buy',
        strike: asNumber(o.strike),
        expiration: asString(o.expiration),
        contracts: asNumber(o.contracts, 1),
        premium: asNumber(o.premium),
        currentPremium: asOptionalNumber(o.currentPremium),
        openDate: asString(o.openDate, today()),
      };
    default:
      return null;
  }
};

// Short, readable summary of a proposal for the confirmation card.
export const describeChange = (c: ProposedChange): string => {
  switch (c.kind) {
    case 'portfolio':
      return `Portefeuille "${c.name}" (${c.currency}, beschikbare cash ${c.availableCash})`;
    case 'stock': {
      const cur = c.currentPrice !== undefined ? `, huidig ${c.currentPrice}` : '';
      return `${c.assetType === 'etf' ? 'ETF' : 'Aandeel'} ${c.ticker}: ${c.shares} @ ${c.purchasePrice}${cur} → ${c.portfolio}`;
    }
    case 'option':
      return `${c.action === 'buy' ? 'Long' : 'Short'} ${c.optionType.toUpperCase()} ${c.ticker} ${c.strike} exp ${c.expiration} ×${c.contracts} @ ${c.premium} → ${c.portfolio}`;
  }
};

// ---------------------------------------------------------------------------
// Execute read tool.
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
// Apply confirmed proposals to the store.
// ---------------------------------------------------------------------------
let seq = 0;
const uid = (prefix: string): string => `${prefix}-${Date.now()}-${++seq}`;


const ensureTickerInStore = (
  getState: () => RootState,
  dispatch: AppDispatch,
  symbol: string,
  name: string,
  type: 'stock' | 'etf',
  _price?: number
): void => {
  const exists = selectAllTickers(getState()).some(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (exists) return;
  const ts = new Date().toISOString();
  const ticker: Ticker = {
    symbol,
    name: name || symbol,
    type,
    optionsAvailable: true,
    miniContractsAvailable: false,
    lastUsed: ts,
    createdAt: ts,
  };
  dispatch(addTickerCommand(ticker, ts));
};

// Current value of a position (for the total-deposit calculation).
const positionValue = (c: ProposedChange): number => {
  if (c.kind === 'stock') return c.shares * (c.currentPrice ?? c.purchasePrice);
  if (c.kind === 'option') {
    const total = (c.currentPremium ?? c.premium) * c.contracts * 100;
    return c.action === 'buy' ? total : -total;
  }
  return 0;
};

const createPortfolio = (
  c: Extract<ProposedChange, { kind: 'portfolio' }>,
  depositAmount: number,
  dispatch: AppDispatch
): void => {
  const ts = new Date().toISOString();
  const portfolio: Portfolio = {
    id: uid('pf'),
    name: c.name,
    logo: DEFAULT_PORTFOLIO_LOGO,
    pricePerContract: 100,
    strategy: '',
    hasOptions: true,
    strategies: [],
    currency: c.currency,
    startDate: today(),
    initialCapital: depositAmount,
    currentValue: depositAmount,
  };
  dispatch(createPortfolioCmd(portfolio, ts));
  // Transaction ledger line derived from the CashDeposited event by the transaction projection.
  if (depositAmount > 0) {
    dispatch(
      depositCmd(
        {
          portfolio: c.name,
          amount: depositAmount,
          date: today(),
          description: 'Initiële storting',
        },
        ts
      )
    );
  }
};

const applyStock = (
  c: Extract<ProposedChange, { kind: 'stock' }>,
  getState: () => RootState,
  dispatch: AppDispatch
): void => {
  const price = c.currentPrice ?? c.purchasePrice;
  ensureTickerInStore(getState, dispatch, c.ticker, c.name, c.assetType, price);
  // Update the current price on the ticker (even if the ticker already existed),
  // since the current value of stock positions comes from the ticker price.
  if (c.currentPrice !== undefined) {
    dispatch(updateTickerPrice({ symbol: c.ticker, price: c.currentPrice }));
  }
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
    currentPrice: price,
    currentValue: c.shares * price,
    optionsSupported: true,
    miniContractsSupported: false,
  };
  dispatch(openPosition(position, new Date().toISOString()));
  // Transaction ledger line (position_buy) derived from PositionOpened event by the transaction projection.
};

const applyOption = (
  c: Extract<ProposedChange, { kind: 'option' }>,
  getState: () => RootState,
  dispatch: AppDispatch
): void => {
  // Create the underlying ticker if needed (asking for the name is done by the agent).
  ensureTickerInStore(getState, dispatch, c.ticker, c.tickerName ?? c.ticker, 'stock');
  const openTotal = c.premium * c.contracts * 100;
  const costBasis = c.action === 'buy' ? openTotal : -openTotal;
  // Current premium (last price) determines the current value; falls back to the open premium.
  const curPremium = c.currentPremium ?? c.premium;
  const curTotal = curPremium * c.contracts * 100;
  const currentValue = c.action === 'buy' ? curTotal : -curTotal;
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
    currentPremium: c.currentPremium,
    costBasis,
    currentValue,
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
  dispatch(openPosition(position, new Date().toISOString()));
  // Transaction ledger line (premium_paid / premium_collected) derived from PositionOpened event by the transaction projection.
};

// Level gating for AI proposals: an option proposal may only be applied
// once the associated strategy has been unlocked knowledge-wise. This prevents the assistant
// from creating a position beyond the user's knowledge level.
export const isOptionChangeAllowed = (
  c: Extract<ProposedChange, { kind: 'option' }>,
  unlockedLevels: UserLevel[]
): boolean => {
  const feature = getOptionActionFeature(c.optionType, c.action);
  return isFeatureAvailable(feature, unlockedLevels);
};

// Applies all proposals: first portfolios (with total deposit = cash +
// value of the associated positions), then the positions themselves.
// Option proposals for not-yet-unlocked strategies are skipped;
// these are returned as `skipped` so the caller can inform the user.
export const applyChanges = (
  changes: ProposedChange[],
  getState: () => RootState,
  dispatch: AppDispatch
): { applied: ProposedChange[]; skipped: ProposedChange[] } => {
  const unlockedLevels = selectUnlockedLevels(getState());

  // Filter out option proposals that go beyond the user's knowledge level.
  const skipped: ProposedChange[] = [];
  const applied = changes.filter((c) => {
    if (c.kind === 'option' && !isOptionChangeAllowed(c, unlockedLevels)) {
      skipped.push(c);
      return false;
    }
    return true;
  });

  // Determine the total deposit per newly created portfolio.
  const deposits = new Map<string, number>();
  for (const c of applied) {
    if (c.kind === 'portfolio') deposits.set(c.name, c.availableCash);
  }
  for (const c of applied) {
    if (c.kind !== 'portfolio' && deposits.has(c.portfolio)) {
      deposits.set(c.portfolio, (deposits.get(c.portfolio) ?? 0) + positionValue(c));
    }
  }

  for (const c of applied) {
    if (c.kind === 'portfolio')
      createPortfolio(c, deposits.get(c.name) ?? c.availableCash, dispatch);
  }
  for (const c of applied) {
    if (c.kind === 'stock') applyStock(c, getState, dispatch);
    else if (c.kind === 'option') applyOption(c, getState, dispatch);
  }

  return { applied, skipped };
};

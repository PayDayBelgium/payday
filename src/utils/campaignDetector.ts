import type { Position, CallOption, PutOption, StockPosition, WheelCampaign } from '../types';
import { differenceInDays, parseISO } from 'date-fns';
import { computeCoveredCallCapacity } from './coveredCallEligibility';

export type CampaignType = 'covered-call' | 'pmcc' | 'kaching' | 'wheel';

export interface CampaignRoot {
  position: Position;
  type: 'stock' | 'leaps-call' | 'protective-put';
  quantity: number; // shares or contracts
  originalCostBasis: number;
  adjustedCostBasis: number;
  totalPremiumCollected: number;
}

export interface CampaignWrittenOption {
  position: CallOption | PutOption;
  status: 'open' | 'closed';
  premiumCollected: number;
  realizedPnL?: number;
  closeDate?: string;
}

export interface Campaign {
  id: string;
  type: CampaignType;
  ticker: string;
  portfolio: string;
  root: CampaignRoot;
  activeOptions: CampaignWrittenOption[];
  historicalOptions: CampaignWrittenOption[];
  coverage: string; // e.g., "5/10" for 5 covered calls on 10 contracts
  hasOpportunity: boolean;
  opportunityMessage?: string;
  totalPremiumCollected: number;
  totalRealizedPnL: number;
  status: 'active' | 'completed';
}

/**
 * Check if a call option qualifies as a LEAPS
 * LEAPS: time between open date and expiration is more than 3 months (90 days)
 */
export function isLEAPS(option: CallOption | PutOption): boolean {
  if (!option.expiration || !option.openDate) return false;

  const openDate = parseISO(option.openDate);
  const expDate = parseISO(option.expiration);
  const daysToExpiration = differenceInDays(expDate, openDate);

  return daysToExpiration >= 90;
}

/**
 * Check if a put option qualifies for KaChing (protective put with 6+ weeks)
 */
export function isKaChingEligible(option: PutOption): boolean {
  if (!option.expiration || !option.openDate) return false;
  if (option.action !== 'buy') return false;

  const openDate = parseISO(option.openDate);
  const expDate = parseISO(option.expiration);
  const daysToExpiration = differenceInDays(expDate, openDate);

  return daysToExpiration >= 42; // 6 weeks
}

/**
 * Detect all campaigns in a portfolio
 */
export function detectCampaigns(
  positions: Position[],
  closedPositions: Position[]
): Campaign[] {
  const campaigns: Campaign[] = [];
  const openPositions = positions.filter(p => p.status === 'open');

  // Group positions by ticker
  const positionsByTicker = new Map<string, Position[]>();
  openPositions.forEach(p => {
    const ticker = p.ticker.toUpperCase();
    if (!positionsByTicker.has(ticker)) {
      positionsByTicker.set(ticker, []);
    }
    positionsByTicker.get(ticker)!.push(p);
  });

  // Also group closed positions by ticker for history
  const closedByTicker = new Map<string, Position[]>();
  closedPositions.forEach(p => {
    const ticker = p.ticker.toUpperCase();
    if (!closedByTicker.has(ticker)) {
      closedByTicker.set(ticker, []);
    }
    closedByTicker.get(ticker)!.push(p);
  });

  // Check each ticker for campaigns
  positionsByTicker.forEach((tickerPositions, ticker) => {
    const portfolio = tickerPositions[0]?.portfolio || '';
    const closedTickerPositions = closedByTicker.get(ticker) || [];

    // 1. Check for Covered Call campaigns (stock + short calls)
    // Exclude positions that are already linked to a wheel
    const stocks = tickerPositions.filter(p =>
      (p.type === 'stock' || p.type === 'etf') && !p.wheelId
    ) as StockPosition[];
    const shortCalls = tickerPositions.filter(p =>
      p.type === 'call' && (p as CallOption).action === 'sell' && !p.wheelId
    ) as CallOption[];

    const tickerLots = stocks;
    const tickerSoldCalls = shortCalls;
    if (computeCoveredCallCapacity(tickerLots, tickerSoldCalls).maxContracts >= 1) {
      stocks.forEach(stock => {
        const campaign = createCoveredCallCampaign(
          stock,
          shortCalls,
          closedTickerPositions,
          ticker,
          portfolio
        );
        if (campaign) {
          campaigns.push(campaign);
        }
      });
    }

    // 2. Check for PMCC campaigns (LEAPS call + short calls)
    // Exclude positions that are already linked to a wheel
    const longCalls = tickerPositions.filter(p =>
      p.type === 'call' && (p as CallOption).action === 'buy' && !p.wheelId
    ) as CallOption[];

    longCalls.forEach(longCall => {
      if (isLEAPS(longCall)) {
        const campaign = createPMCCCampaign(
          longCall,
          shortCalls,
          closedTickerPositions,
          ticker,
          portfolio
        );
        if (campaign) {
          campaigns.push(campaign);
        }
      }
    });

    // 3. Check for KaChing campaigns (protective put + short puts)
    // Exclude positions that are already linked to a wheel
    const longPuts = tickerPositions.filter(p =>
      p.type === 'put' && (p as PutOption).action === 'buy' && !p.wheelId
    ) as PutOption[];
    const shortPuts = tickerPositions.filter(p =>
      p.type === 'put' && (p as PutOption).action === 'sell' && !p.wheelId
    ) as PutOption[];

    longPuts.forEach(longPut => {
      if (isKaChingEligible(longPut)) {
        const campaign = createKaChingCampaign(
          longPut,
          shortPuts,
          closedTickerPositions,
          ticker,
          portfolio
        );
        if (campaign) {
          campaigns.push(campaign);
        }
      }
    });
  });

  return campaigns;
}

function createCoveredCallCampaign(
  stock: StockPosition,
  shortCalls: CallOption[],
  closedPositions: Position[],
  ticker: string,
  portfolio: string
): Campaign | null {
  const contractsNeeded = Math.floor(stock.shares / 100);

  // Filter short calls that belong to this stock position
  // - If underlyingId matches this stock, include it
  // - If no underlyingId is set, include it (backwards compatibility) but only if contracts fit
  const relevantShortCalls = shortCalls.filter(c => {
    if (c.underlyingId) {
      return c.underlyingId === stock.id;
    }
    // No underlyingId set - include if contracts could cover this stock
    return c.contracts <= contractsNeeded;
  });
  const totalCoveredContracts = relevantShortCalls.reduce((sum, c) => sum + c.contracts, 0);

  // Get historical covered calls for this stock
  const historicalCalls = closedPositions.filter(p => {
    if (p.type !== 'call') return false;
    const call = p as CallOption;
    if (call.action !== 'sell' || p.status !== 'closed') return false;

    // If underlyingId is set, it must match this stock
    if (call.underlyingId) {
      return call.underlyingId === stock.id;
    }
    // No underlyingId - include for backwards compatibility
    return true;
  }) as CallOption[];

  // Calculate premiums
  const activePremium = relevantShortCalls.reduce((sum, c) => sum + (c.premium * c.contracts * 100), 0);
  const historicalPremium = historicalCalls.reduce((sum, c) => sum + (c.premium * c.contracts * 100), 0);
  const historicalPnL = historicalCalls.reduce((sum, c) => sum + ((c as any).realizedPnL || 0), 0);

  const totalPremiumCollected = activePremium + historicalPremium;
  const adjustedCostBasis = stock.costBasis - historicalPnL;

  const hasOpportunity = totalCoveredContracts < contractsNeeded;
  const opportunityMessage = hasOpportunity
    ? `Je kunt nog ${contractsNeeded - totalCoveredContracts} covered call(s) schrijven`
    : undefined;

  return {
    id: `cc-${stock.id}`,
    type: 'covered-call',
    ticker,
    portfolio,
    root: {
      position: stock,
      type: 'stock',
      quantity: stock.shares,
      originalCostBasis: stock.costBasis,
      adjustedCostBasis,
      totalPremiumCollected,
    },
    activeOptions: relevantShortCalls.map(c => ({
      position: c,
      status: 'open' as const,
      premiumCollected: c.premium * c.contracts * 100,
    })),
    historicalOptions: historicalCalls.map(c => ({
      position: c,
      status: 'closed' as const,
      premiumCollected: c.premium * c.contracts * 100,
      realizedPnL: (c as any).realizedPnL,
      closeDate: c.closeDate,
    })),
    coverage: `${totalCoveredContracts}/${contractsNeeded}`,
    hasOpportunity,
    opportunityMessage,
    totalPremiumCollected,
    totalRealizedPnL: historicalPnL,
    status: 'active',
  };
}

function createPMCCCampaign(
  leapsCall: CallOption,
  shortCalls: CallOption[],
  closedPositions: Position[],
  ticker: string,
  portfolio: string
): Campaign | null {
  // Filter short calls that belong to this LEAPS position
  // - If underlyingId matches this LEAPS, include it
  // - If no underlyingId is set, include it based on strike/contracts (backwards compatibility)
  const relevantShortCalls = shortCalls.filter(c => {
    if (c.underlyingId) {
      return c.underlyingId === leapsCall.id;
    }
    // No underlyingId set - use original logic for backwards compatibility
    return c.strike > leapsCall.strike && c.contracts <= leapsCall.contracts;
  });
  const totalCoveredContracts = relevantShortCalls.reduce((sum, c) => sum + c.contracts, 0);

  // Get historical covered calls for this LEAPS
  const historicalCalls = closedPositions.filter(p => {
    if (p.type !== 'call') return false;
    const call = p as CallOption;
    if (call.action !== 'sell' || p.status !== 'closed') return false;

    // If underlyingId is set, it must match this LEAPS
    if (call.underlyingId) {
      return call.underlyingId === leapsCall.id;
    }
    // No underlyingId - use original logic for backwards compatibility
    return call.strike > leapsCall.strike;
  }) as CallOption[];

  // Calculate premiums
  const activePremium = relevantShortCalls.reduce((sum, c) => sum + (c.premium * c.contracts * 100), 0);
  const historicalPremium = historicalCalls.reduce((sum, c) => sum + (c.premium * c.contracts * 100), 0);
  const historicalPnL = historicalCalls.reduce((sum, c) => sum + ((c as any).realizedPnL || 0), 0);

  const totalPremiumCollected = activePremium + historicalPremium;
  const adjustedCostBasis = leapsCall.costBasis - historicalPnL;

  const hasOpportunity = totalCoveredContracts < leapsCall.contracts;
  const opportunityMessage = hasOpportunity
    ? `Je kunt nog ${leapsCall.contracts - totalCoveredContracts} covered call(s) schrijven op je LEAPS`
    : undefined;

  return {
    id: `pmcc-${leapsCall.id}`,
    type: 'pmcc',
    ticker,
    portfolio,
    root: {
      position: leapsCall,
      type: 'leaps-call',
      quantity: leapsCall.contracts,
      originalCostBasis: leapsCall.costBasis,
      adjustedCostBasis,
      totalPremiumCollected,
    },
    activeOptions: relevantShortCalls.map(c => ({
      position: c,
      status: 'open' as const,
      premiumCollected: c.premium * c.contracts * 100,
    })),
    historicalOptions: historicalCalls.map(c => ({
      position: c,
      status: 'closed' as const,
      premiumCollected: c.premium * c.contracts * 100,
      realizedPnL: (c as any).realizedPnL,
      closeDate: c.closeDate,
    })),
    coverage: `${totalCoveredContracts}/${leapsCall.contracts}`,
    hasOpportunity,
    opportunityMessage,
    totalPremiumCollected,
    totalRealizedPnL: historicalPnL,
    status: 'active',
  };
}

function createKaChingCampaign(
  protectivePut: PutOption,
  shortPuts: PutOption[],
  closedPositions: Position[],
  ticker: string,
  portfolio: string
): Campaign | null {
  // Filter short puts that belong to this protective put position
  // - If underlyingId matches this protective put, include it
  // - If no underlyingId is set, include it based on strike/contracts (backwards compatibility)
  const relevantShortPuts = shortPuts.filter(p => {
    if (p.underlyingId) {
      return p.underlyingId === protectivePut.id;
    }
    // No underlyingId set - use original logic for backwards compatibility
    return p.strike > protectivePut.strike && p.contracts <= protectivePut.contracts;
  });
  const totalCoveredContracts = relevantShortPuts.reduce((sum, p) => sum + p.contracts, 0);

  // Get historical short puts for this protective put
  const historicalPuts = closedPositions.filter(p => {
    if (p.type !== 'put') return false;
    const put = p as PutOption;
    if (put.action !== 'sell' || p.status !== 'closed') return false;

    // If underlyingId is set, it must match this protective put
    if (put.underlyingId) {
      return put.underlyingId === protectivePut.id;
    }
    // No underlyingId - use original logic for backwards compatibility
    return put.strike > protectivePut.strike;
  }) as PutOption[];

  // Calculate premiums
  const activePremium = relevantShortPuts.reduce((sum, p) => sum + (p.premium * p.contracts * 100), 0);
  const historicalPremium = historicalPuts.reduce((sum, p) => sum + (p.premium * p.contracts * 100), 0);
  const historicalPnL = historicalPuts.reduce((sum, p) => sum + ((p as any).realizedPnL || 0), 0);

  const totalPremiumCollected = activePremium + historicalPremium;
  // For KaChing, we're reducing the cost of the protective put
  const adjustedCostBasis = protectivePut.costBasis - historicalPnL;

  const hasOpportunity = totalCoveredContracts < protectivePut.contracts;
  const opportunityMessage = hasOpportunity
    ? `Je kunt nog ${protectivePut.contracts - totalCoveredContracts} put(s) schrijven deze week`
    : undefined;

  // Calculate if we've recovered the cost of the protective put
  const costRecovered = historicalPnL >= protectivePut.costBasis;
  const profitAfterRecovery = costRecovered ? historicalPnL - protectivePut.costBasis : 0;

  return {
    id: `kaching-${protectivePut.id}`,
    type: 'kaching',
    ticker,
    portfolio,
    root: {
      position: protectivePut,
      type: 'protective-put',
      quantity: protectivePut.contracts,
      originalCostBasis: protectivePut.costBasis,
      adjustedCostBasis,
      totalPremiumCollected,
    },
    activeOptions: relevantShortPuts.map(p => ({
      position: p,
      status: 'open' as const,
      premiumCollected: p.premium * p.contracts * 100,
    })),
    historicalOptions: historicalPuts.map(p => ({
      position: p,
      status: 'closed' as const,
      premiumCollected: p.premium * p.contracts * 100,
      realizedPnL: (p as any).realizedPnL,
      closeDate: p.closeDate,
    })),
    coverage: `${totalCoveredContracts}/${protectivePut.contracts}`,
    hasOpportunity,
    opportunityMessage,
    totalPremiumCollected,
    totalRealizedPnL: historicalPnL,
    status: 'active',
  };
}

/**
 * Get campaign type display name
 */
export function getCampaignTypeName(type: CampaignType): string {
  switch (type) {
    case 'covered-call':
      return 'Covered Call';
    case 'pmcc':
      return "Poor Man's Covered Call";
    case 'kaching':
      return 'KaChing';
    case 'wheel':
      return 'Wheel';
    default:
      return type;
  }
}

/**
 * Get campaign type description
 */
export function getCampaignTypeDescription(type: CampaignType): string {
  switch (type) {
    case 'covered-call':
      return 'Schrijf wekelijks/maandelijks calls op je aandelen om extra inkomen te genereren en je kostenbasis te verlagen.';
    case 'pmcc':
      return 'Gebruik een LEAPS call als onderpand om regelmatig calls te schrijven. Ideaal om met minder kapitaal inkomen te genereren.';
    case 'kaching':
      return 'Koop een protective put en schrijf wekelijks puts boven die strike. Het doel is de kost van de bescherming terug te verdienen en winst te maken.';
    case 'wheel':
      return 'Cyclische strategie: verkoop cash-secured puts tot assignment, schrijf dan covered calls op de aandelen tot verkoop, en herhaal.';
    default:
      return '';
  }
}

/**
 * Build a Wheel campaign from a WheelCampaign record and related positions
 */
export function buildWheelCampaign(
  wheel: WheelCampaign,
  positions: Position[],
  closedPositions: Position[]
): Campaign | null {
  const ticker = wheel.ticker.toUpperCase();

  // Get all positions linked to this wheel
  const wheelPositions = positions.filter(p => {
    if (p.type === 'stock' || p.type === 'etf') {
      return (p as StockPosition).wheelId === wheel.id;
    }
    if (p.type === 'call') {
      return (p as CallOption).wheelId === wheel.id;
    }
    if (p.type === 'put') {
      return (p as PutOption).wheelId === wheel.id;
    }
    return false;
  });

  const closedWheelPositions = closedPositions.filter(p => {
    if (p.type === 'stock' || p.type === 'etf') {
      return (p as StockPosition).wheelId === wheel.id;
    }
    if (p.type === 'call') {
      return (p as CallOption).wheelId === wheel.id;
    }
    if (p.type === 'put') {
      return (p as PutOption).wheelId === wheel.id;
    }
    return false;
  });

  // Separate by type
  const activePuts = wheelPositions.filter(p =>
    p.type === 'put' && (p as PutOption).action === 'sell'
  ) as PutOption[];

  const activeCalls = wheelPositions.filter(p =>
    p.type === 'call' && (p as CallOption).action === 'sell'
  ) as CallOption[];

  const activeStock = wheelPositions.find(p =>
    p.type === 'stock' || p.type === 'etf'
  ) as StockPosition | undefined;

  // Historical options
  const historicalPuts = closedWheelPositions.filter(p =>
    p.type === 'put' && (p as PutOption).action === 'sell'
  ) as PutOption[];

  const historicalCalls = closedWheelPositions.filter(p =>
    p.type === 'call' && (p as CallOption).action === 'sell'
  ) as CallOption[];

  // Calculate premiums
  const activePutPremium = activePuts.reduce((sum, p) => sum + (p.premium * p.contracts * 100), 0);
  const activeCallPremium = activeCalls.reduce((sum, p) => sum + (p.premium * p.contracts * 100), 0);
  const historicalPutPremium = historicalPuts.reduce((sum, p) => sum + (p.premium * p.contracts * 100), 0);
  const historicalCallPremium = historicalCalls.reduce((sum, p) => sum + (p.premium * p.contracts * 100), 0);
  const historicalPutPnL = historicalPuts.reduce((sum, p) => sum + ((p as any).realizedPnL || 0), 0);
  const historicalCallPnL = historicalCalls.reduce((sum, p) => sum + ((p as any).realizedPnL || 0), 0);

  const totalPremiumCollected = activePutPremium + activeCallPremium + historicalPutPremium + historicalCallPremium;
  const totalRealizedPnL = historicalPutPnL + historicalCallPnL;

  // Determine current phase and create appropriate root
  let root: CampaignRoot;
  let activeOptions: CampaignWrittenOption[] = [];
  let historicalOptions: CampaignWrittenOption[] = [];
  let coverage = '0/0';
  let hasOpportunity = false;
  let opportunityMessage: string | undefined;

  if (wheel.phase === 'stock' && activeStock) {
    // Stock phase - covered calls
    const contractsNeeded = Math.floor(activeStock.shares / 100);
    const totalCoveredContracts = activeCalls.reduce((sum, c) => sum + c.contracts, 0);

    root = {
      position: activeStock,
      type: 'stock',
      quantity: activeStock.shares,
      originalCostBasis: activeStock.costBasis,
      adjustedCostBasis: activeStock.costBasis - totalRealizedPnL,
      totalPremiumCollected,
    };

    activeOptions = activeCalls.map(c => ({
      position: c,
      status: 'open' as const,
      premiumCollected: c.premium * c.contracts * 100,
    }));

    // Coverage shows cycle phase for Wheel (no x/y since there's only 1 option at a time)
    coverage = totalCoveredContracts === 0 ? 'Covered Call Fase - Te Starten' : 'Covered Call Fase - Actief';
    hasOpportunity = totalCoveredContracts < contractsNeeded;
    opportunityMessage = hasOpportunity
      ? `Je kunt nog ${contractsNeeded - totalCoveredContracts} covered call(s) schrijven`
      : undefined;
  } else {
    // Cash Secured Put phase or no stock yet
    const totalPutContracts = activePuts.reduce((sum, p) => sum + p.contracts, 0);

    // Use first active put as root position, or create a dummy if none
    const rootPut = activePuts[0];

    if (rootPut) {
      root = {
        position: rootPut,
        type: 'protective-put', // We'll display this differently for Wheel
        quantity: wheel.targetContracts,
        originalCostBasis: 0, // Cash Secured Put generates premium
        adjustedCostBasis: -totalRealizedPnL, // Negative = profit
        totalPremiumCollected,
      };

      activeOptions = activePuts.map(p => ({
        position: p,
        status: 'open' as const,
        premiumCollected: p.premium * p.contracts * 100,
      }));
    } else {
      // No active positions yet - create a placeholder root
      // This happens when a wheel is just started and no CSPs written yet
      const dummyPosition: PutOption = {
        id: `wheel-placeholder-${wheel.id}`,
        type: 'put',
        ticker: wheel.ticker,
        portfolio: wheel.portfolio,
        action: 'sell',
        status: 'open',
        strike: 0,
        expiration: '',
        contracts: 0,
        premium: 0,
        costBasis: 0,
        currentValue: 0,
        openDate: wheel.startDate,
      };

      root = {
        position: dummyPosition,
        type: 'protective-put',
        quantity: wheel.targetContracts,
        originalCostBasis: 0,
        adjustedCostBasis: -totalRealizedPnL,
        totalPremiumCollected,
      };
    }

    // Coverage shows cycle phase for Wheel (no x/y since there's only 1 option at a time)
    coverage = totalPutContracts === 0
      ? 'Cash Secured Put Fase - Te Starten'
      : 'Cash Secured Put Fase - Actief';
    // Only show opportunity if we need more puts
    hasOpportunity = totalPutContracts < wheel.targetContracts;
    opportunityMessage = totalPutContracts === 0
      ? `Start met het schrijven van ${wheel.targetContracts} cash-secured put(s)`
      : totalPutContracts < wheel.targetContracts
      ? `Je kunt nog ${wheel.targetContracts - totalPutContracts} cash-secured put(s) schrijven`
      : undefined;
  }

  // Combine all historical options
  historicalOptions = [
    ...historicalPuts.map(p => ({
      position: p,
      status: 'closed' as const,
      premiumCollected: p.premium * p.contracts * 100,
      realizedPnL: (p as any).realizedPnL,
      closeDate: p.closeDate,
    })),
    ...historicalCalls.map(c => ({
      position: c,
      status: 'closed' as const,
      premiumCollected: c.premium * c.contracts * 100,
      realizedPnL: (c as any).realizedPnL,
      closeDate: c.closeDate,
    })),
  ].sort((a, b) => {
    // Sort by closeDate first (newest first)
    if (a.closeDate && b.closeDate) {
      const dateCompare = new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime();
      if (dateCompare !== 0) return dateCompare;
    }
    // If closeDates are equal, sort by openDate (newest first)
    if (a.position.openDate && b.position.openDate) {
      const openDateCompare = new Date(b.position.openDate).getTime() - new Date(a.position.openDate).getTime();
      if (openDateCompare !== 0) return openDateCompare;
    }
    // If both dates are equal, sort by position ID (higher ID = newer)
    return b.position.id.localeCompare(a.position.id);
  });

  return {
    id: `wheel-${wheel.id}`,
    type: 'wheel',
    ticker,
    portfolio: wheel.portfolio,
    root,
    activeOptions,
    historicalOptions,
    coverage,
    hasOpportunity,
    opportunityMessage,
    totalPremiumCollected,
    totalRealizedPnL,
    status: wheel.status,
  };
}

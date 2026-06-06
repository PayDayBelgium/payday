import type { Position, CallOption, PutOption } from '../types';
import { getDaysToExpiration } from './dateHelpers';

/**
 * Bereken het aantal dagen tot expiratie (DTE) voor een optie.
 *
 * LET OP: dit is een PortfolioView-specifieke variant die `undefined` afhandelt
 * en delegeert naar `getDaysToExpiration`. Bewust NIET hergebruikt uit
 * optionWizardUtils.calculateDTE — die implementatie wijkt af (eigen Math.max/ceil).
 */
export const calculateDTE = (expiration: string | undefined): number => {
  if (!expiration) return 0;
  return getDaysToExpiration(expiration);
};

/**
 * Controleer of een optie een LEAP is (>90 dagen / 3 maanden tot expiratie).
 *
 * LET OP: dit is een PortfolioView-specifieke variant die uitsluitend calls
 * beschouwt en DTE vanaf vandaag meet. Bewust NIET hergebruikt uit
 * campaignDetector.isLEAPS — die meet vanaf openDate en kijkt naar calls + puts.
 */
export const isLEAPS = (position: Position): boolean => {
  if (position.type !== 'call') return false;
  const option = position as CallOption;
  return calculateDTE(option.expiration) > 90;
};

/**
 * Bereken de samenvatting van een spread (2 legs: long + short).
 */
export const calculateSpreadSummary = (legs: Position[]) => {
  if (legs.length !== 2) return null;

  const options = legs as (CallOption | PutOption)[];
  const longLeg = options.find((o) => o.action === 'buy');
  const shortLeg = options.find((o) => o.action === 'sell');

  if (!longLeg || !shortLeg) return null;

  const isCredit = shortLeg.premium > longLeg.premium;
  const netPremium = (shortLeg.premium - longLeg.premium) * shortLeg.contracts * 100;
  const spreadWidth = Math.abs(shortLeg.strike - longLeg.strike);
  const totalCostBasis = longLeg.costBasis + shortLeg.costBasis;
  const totalCurrentValue = longLeg.currentValue + shortLeg.currentValue;
  const totalPnL = totalCurrentValue - totalCostBasis;

  const maxProfit = isCredit
    ? netPremium
    : (spreadWidth - Math.abs(netPremium / (shortLeg.contracts * 100))) *
      shortLeg.contracts *
      100;

  const maxLoss = isCredit
    ? (spreadWidth - Math.abs(netPremium / (shortLeg.contracts * 100))) * shortLeg.contracts * 100
    : Math.abs(netPremium);

  return {
    ticker: longLeg.ticker,
    type: longLeg.type,
    spreadType: isCredit ? 'credit' : 'debit',
    contracts: shortLeg.contracts,
    longStrike: longLeg.strike,
    shortStrike: shortLeg.strike,
    expiration: longLeg.expiration,
    netPremium,
    spreadWidth,
    maxProfit,
    maxLoss,
    totalPnL,
    totalCostBasis,
    totalCurrentValue,
    collateral: isCredit ? spreadWidth * shortLeg.contracts * 100 : 0,
  };
};

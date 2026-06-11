import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  History,
  DollarSign,
  Layers,
  Zap,
  Shield,
  Plus,
  RefreshCw,
  Trash2,
  ArrowUpCircle,
} from 'lucide-react';
import type { Campaign, CampaignType } from '../../utils/campaignDetector';
import { getCampaignTypeName, getCampaignTypeDescription } from '../../utils/campaignDetector';
import type { Ticker, CallOption, PutOption, Position } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { getDaysToExpiration } from '../../utils/dateHelpers';
import { calculateOptionUnrealizedPnL } from '../../utils/pnlCalculations';
import { OptionRow } from './OptionRow';
import type { CollateralType } from './OptionRow';
import { POSITION_GRID_COLS, POSITION_GRID_COLS_COMPACT } from './positionGrid';

interface CampaignCardProps {
  /** The campaign being rendered */
  campaign: Campaign;
  /** Currency symbol for display */
  currencySymbol: string;
  /** Available tickers (for live prices) */
  tickers: Ticker[];
  /** Whether the campaign is expanded */
  isExpanded: boolean;
  /** Whether the basis-position section is expanded */
  isBasisExpanded: boolean;
  /** Whether the active-options section is expanded */
  isActiveExpanded: boolean;
  /** Whether the history is being shown */
  showingHistory: boolean;
  /** Expand/collapse the campaign */
  onToggleCampaign: (id: string) => void;
  /** Expand/collapse the basis-position section */
  onToggleBasisPosition: (campaignId: string) => void;
  /** Expand/collapse the active-options section */
  onToggleActiveOptions: (campaignId: string) => void;
  /** Show/hide the history */
  onToggleHistory: (id: string) => void;
  /** Delete the wheel (wheelId already extracted from campaign.id) */
  onDeleteWheel: (wheelId: string) => void;
  /** Open the roll modal for an option */
  onRoll: (option: CallOption | PutOption) => void;
  /** Open the close modal for a position */
  onClose: (option: Position) => void;
  /** Open the assignment modal for an option */
  onAssign: (option: CallOption | PutOption) => void;
  /** Open the detail modal for a position */
  onView: (option: Position) => void;
  /** Open the appropriate wizard from the opportunity button */
  onOpportunityAction: (campaign: Campaign) => void;
}

// Get icon for campaign type
const getCampaignIcon = (type: CampaignType) => {
  switch (type) {
    case 'covered-call':
      return <TrendingUp className="w-5 h-5" />;
    case 'pmcc':
      return <Layers className="w-5 h-5" />;
    case 'kaching':
      return <Zap className="w-5 h-5" />;
    case 'wheel':
      return <RefreshCw className="w-5 h-5" />;
    default:
      return <Target className="w-5 h-5" />;
  }
};

// Get color for campaign type
const getCampaignColor = (type: CampaignType) => {
  switch (type) {
    case 'covered-call':
      return 'blue';
    case 'pmcc':
      return 'purple';
    case 'kaching':
      return 'amber';
    case 'wheel':
      return 'teal';
    default:
      return 'gray';
  }
};

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  currencySymbol,
  tickers,
  isExpanded,
  isBasisExpanded,
  isActiveExpanded,
  showingHistory,
  onToggleCampaign,
  onToggleBasisPosition,
  onToggleActiveOptions,
  onToggleHistory,
  onDeleteWheel,
  onRoll,
  onClose,
  onAssign,
  onView,
  onOpportunityAction,
}) => {
  const { t } = useTranslation();
  const color = getCampaignColor(campaign.type);

  return (
    <div className="p-4">
      {/* Campaign Header */}
      <div
        onClick={() => onToggleCampaign(campaign.id)}
        className="flex items-center justify-between cursor-pointer p-3 -m-3 rounded-lg bg-surface-subtle dark:bg-trading-dark-700/50 hover:bg-surface-muted dark:hover:bg-trading-dark-700/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}
          >
            {getCampaignIcon(campaign.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-ink-900 dark:text-white">{campaign.ticker}</h3>
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400`}
              >
                {getCampaignTypeName(campaign.type)}
              </span>
              {campaign.hasOpportunity && (
                <Lightbulb
                  className="w-4 h-4 text-positive-600"
                  aria-label={campaign.opportunityMessage}
                />
              )}
            </div>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              {campaign.type === 'wheel' ? campaign.coverage : `Coverage: ${campaign.coverage}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* For Wheel: Show Collateral and Total Premium */}
          {campaign.type === 'wheel' ? (
            <>
              {/* Current Collateral */}
              <div className="text-right">
                <p className="text-xs text-ink-500 dark:text-ink-400">{t('widgetsA.collateral')}</p>
                {campaign.activeOptions.length > 0 ? (
                  <>
                    {campaign.activeOptions[0].position.type === 'put' ? (
                      <p className="font-semibold text-ink-900 dark:text-white">
                        {formatCurrency(
                          (campaign.activeOptions[0].position as PutOption).strike *
                            (campaign.activeOptions[0].position as PutOption).contracts *
                            100,
                          currencySymbol
                        )}
                        <span className="text-xs text-ink-500 ml-1">cash</span>
                      </p>
                    ) : (
                      <p className="font-semibold text-ink-900 dark:text-white">
                        {campaign.root.quantity}
                        <span className="text-xs text-ink-500 ml-1">{t('widgetsA.shares')}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-semibold text-ink-500 dark:text-ink-400">-</p>
                )}
              </div>

              {/* Total P&L (realized + unrealized) */}
              <div className="text-right">
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  {t('widgetsA.totalProfit')}
                </p>
                {(() => {
                  // Calculate total P&L: realized from closed positions + unrealized from active option
                  let totalPnL = campaign.totalRealizedPnL;

                  // Add unrealized P&L from active option using utility function
                  if (campaign.activeOptions.length > 0) {
                    const activeOption = campaign.activeOptions[0].position;
                    const unrealizedPnL = calculateOptionUnrealizedPnL({
                      action: activeOption.action,
                      costBasis: activeOption.costBasis,
                      currentValue: activeOption.currentValue,
                    });
                    totalPnL += unrealizedPnL;
                  }

                  return (
                    <p
                      className={`font-bold ${
                        totalPnL > 0
                          ? 'text-positive-600 dark:text-positive-500'
                          : totalPnL < 0
                            ? 'text-negative-600 dark:text-negative-500'
                            : 'text-ink-900 dark:text-white'
                      }`}
                    >
                      {totalPnL > 0 ? '+' : ''}
                      {formatCurrency(totalPnL, currencySymbol)}
                    </p>
                  );
                })()}
              </div>
            </>
          ) : (
            <>
              {/* Purchase cost - for non-Wheel campaigns */}
              <div className="text-right">
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  {t('widgetsA.purchaseCost')}
                </p>
                <p className="font-semibold text-ink-900 dark:text-white">
                  {formatCurrency(campaign.root.originalCostBasis, currencySymbol)}
                </p>
              </div>

              {/* Premiums received - for non-Wheel campaigns */}
              <div className="text-right">
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  {t('widgetsA.premiumsReceived')}
                </p>
                <p className="font-semibold text-positive-600 dark:text-positive-500">
                  +
                  {formatCurrency(
                    campaign.root.originalCostBasis - campaign.root.adjustedCostBasis,
                    currencySymbol
                  )}
                </p>
              </div>
            </>
          )}

          {/* Delete Wheel Button - only for wheel campaigns */}
          {campaign.type === 'wheel' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Extract the actual wheel ID from campaign.id (format: wheel-${wheel.id})
                const wheelId = campaign.id.replace('wheel-', '');
                onDeleteWheel(wheelId);
              }}
              className="p-1.5 text-ink-400 hover:text-negative-600 dark:hover:text-negative-500 transition-colors rounded hover:bg-negative-50 dark:hover:bg-negative-700/20"
              title={t('widgetsA.deleteWheel')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Expand Icon */}
          <div className="text-ink-400">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Description */}
          <p className="text-sm text-ink-600 dark:text-ink-400 bg-surface dark:bg-trading-dark-700/50 p-3 rounded-lg">
            {getCampaignTypeDescription(campaign.type)}
          </p>

          {/* Root Position - hide for Wheel campaigns */}
          {campaign.type !== 'wheel' &&
            (() => {
              const tickerData = tickers.find(
                (t) => t.symbol.toUpperCase() === campaign.ticker.toUpperCase()
              );
              const stock = campaign.root.position as any;
              const currentPrice = tickerData?.currentPrice || 0;
              const purchasePricePerShare =
                campaign.root.quantity > 0
                  ? campaign.root.originalCostBasis / campaign.root.quantity
                  : 0;

              // Calculate current value based on ticker price for stocks
              const liveCurrentValue =
                campaign.root.type !== 'leaps-call' && currentPrice > 0
                  ? campaign.root.quantity * currentPrice
                  : stock.currentValue || campaign.root.originalCostBasis;
              const profitLoss = liveCurrentValue - campaign.root.originalCostBasis;
              const profitLossPercentage =
                campaign.root.originalCostBasis > 0
                  ? (profitLoss / campaign.root.originalCostBasis) * 100
                  : 0;

              return (
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBasisPosition(campaign.id);
                    }}
                    className="w-full text-sm font-semibold text-ink-700 dark:text-ink-300 mb-2 flex items-center gap-2 hover:text-ink-900 dark:hover:text-white transition-colors"
                  >
                    {isBasisExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Shield className="w-4 h-4" />
                    {t('widgetsA.basisPosition')}
                  </button>
                  {isBasisExpanded && (
                    <div className="border border-surface-line dark:border-trading-dark-600 rounded-lg overflow-hidden bg-surface dark:bg-trading-dark-800/50">
                      {/* Column Headers */}
                      <div className="px-6 py-2 bg-surface-subtle dark:bg-trading-dark-900/50 border-b border-surface-line dark:border-trading-dark-600">
                        <div
                          className={`grid ${POSITION_GRID_COLS_COMPACT} gap-2 text-xs font-semibold text-ink-600 dark:text-ink-400 items-center`}
                        >
                          <div></div> {/* Icon */}
                          <div>{t('widgetsA.colTicker')}</div>
                          <div>{t('widgetsA.colExpiration')}</div>
                          <div>{t('widgetsA.colStrike')}</div>
                          <div>{t('widgetsA.colStockPrice')}</div>
                          <div>{t('widgetsA.colDifference')}</div>
                          <div>{t('widgetsA.colOpen')}</div>
                          <div>{t('widgetsA.colCurrent')}</div>
                          <div>{t('widgetsA.colProfitLoss')}</div>
                          <div>{t('widgetsA.colAdjusted')}</div>
                        </div>
                      </div>
                      {/* Root Position - Same grid structure as PortfolioView */}
                      <div className="px-6 py-3 hover:bg-surface-subtle dark:hover:bg-trading-dark-700/50 transition-colors border-l-4 border-l-gray-300 dark:border-l-gray-600">
                        <div className={`grid ${POSITION_GRID_COLS_COMPACT} gap-2 items-start`}>
                          {/* Icon */}
                          <div
                            className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                              campaign.root.type === 'leaps-call'
                                ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500'
                                : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            }`}
                          >
                            {campaign.root.type === 'leaps-call' ? (
                              <ArrowUpCircle className="w-4 h-4" />
                            ) : (
                              <TrendingUp className="w-4 h-4" />
                            )}
                          </div>

                          {/* Ticker with badges */}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-bold text-ink-900 dark:text-white">
                                {campaign.root.type === 'leaps-call'
                                  ? `${campaign.root.quantity}x ${campaign.ticker}`
                                  : `${campaign.root.quantity}x ${campaign.ticker}`}
                              </h4>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                                  campaign.root.type === 'leaps-call'
                                    ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500'
                                    : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                }`}
                              >
                                {campaign.root.type === 'leaps-call' ? 'LEAPS' : 'STOCK'}
                              </span>
                            </div>
                            {tickerData?.name && (
                              <p className="text-xs text-ink-500 dark:text-ink-400 truncate">
                                {tickerData.name}
                              </p>
                            )}
                          </div>

                          {/* Expiration - only for LEAPS */}
                          <div>
                            {campaign.root.type === 'leaps-call' ? (
                              <>
                                <p className="text-sm font-medium text-ink-900 dark:text-white">
                                  {(campaign.root.position as CallOption).expiration
                                    ? new Date(
                                        (campaign.root.position as CallOption).expiration
                                      ).toLocaleDateString('nl-NL')
                                    : '-'}
                                </p>
                                {(campaign.root.position as CallOption).expiration && (
                                  <p
                                    className={`text-xs ${
                                      getDaysToExpiration(
                                        (campaign.root.position as CallOption).expiration
                                      ) <= 30
                                        ? 'text-negative-600 dark:text-negative-500'
                                        : getDaysToExpiration(
                                              (campaign.root.position as CallOption).expiration
                                            ) <= 90
                                          ? 'text-caution-600 dark:text-caution-500'
                                          : 'text-ink-500 dark:text-ink-400'
                                    }`}
                                  >
                                    {getDaysToExpiration(
                                      (campaign.root.position as CallOption).expiration
                                    )}
                                    d
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-ink-400 dark:text-ink-600">-</p>
                            )}
                          </div>

                          {/* Strike - only for LEAPS */}
                          <div>
                            {campaign.root.type === 'leaps-call' ? (
                              <p className="text-sm font-medium text-ink-900 dark:text-white">
                                {formatCurrency(
                                  (campaign.root.position as CallOption).strike,
                                  currencySymbol
                                )}
                              </p>
                            ) : (
                              <p className="text-sm text-ink-400 dark:text-ink-600">-</p>
                            )}
                          </div>

                          {/* Stock price */}
                          <div>
                            {currentPrice ? (
                              <p className="text-sm font-medium text-ink-900 dark:text-white">
                                {formatCurrency(currentPrice, currencySymbol)}
                              </p>
                            ) : (
                              <p className="text-sm text-ink-400 dark:text-ink-600">-</p>
                            )}
                          </div>

                          {/* Difference */}
                          <div>
                            {currentPrice && campaign.root.type !== 'leaps-call' ? (
                              <p
                                className={`text-sm font-medium ${
                                  currentPrice < purchasePricePerShare
                                    ? 'text-negative-600 dark:text-negative-500'
                                    : 'text-ink-900 dark:text-white'
                                }`}
                              >
                                {currentPrice > purchasePricePerShare ? '+' : ''}
                                {formatCurrency(
                                  currentPrice - purchasePricePerShare,
                                  currencySymbol
                                )}
                              </p>
                            ) : (
                              <p className="text-sm text-ink-400 dark:text-ink-600">-</p>
                            )}
                          </div>

                          {/* Open (Cost basis) */}
                          <div>
                            <p className="text-sm font-medium text-ink-900 dark:text-white">
                              {formatCurrency(purchasePricePerShare, currencySymbol)}
                            </p>
                            <p className="text-xs text-ink-500 dark:text-ink-400">
                              {formatCurrency(campaign.root.originalCostBasis, currencySymbol)}
                            </p>
                          </div>

                          {/* Current */}
                          <div>
                            <p className="text-sm font-medium text-ink-900 dark:text-white">
                              {currentPrice
                                ? formatCurrency(currentPrice, currencySymbol)
                                : formatCurrency(purchasePricePerShare, currencySymbol)}
                            </p>
                            <p className="text-xs text-ink-500 dark:text-ink-400">
                              {formatCurrency(liveCurrentValue, currencySymbol)}
                            </p>
                          </div>

                          {/* Profit/Loss */}
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                profitLoss > 0
                                  ? 'text-positive-600 dark:text-positive-500'
                                  : profitLoss < 0
                                    ? 'text-negative-600 dark:text-negative-500'
                                    : 'text-ink-900 dark:text-white'
                              }`}
                            >
                              {profitLoss > 0 ? '+' : ''}
                              {formatCurrency(profitLoss, currencySymbol)}
                            </p>
                            <p
                              className={`text-xs ${
                                profitLossPercentage > 0
                                  ? 'text-positive-600 dark:text-positive-500'
                                  : profitLossPercentage < 0
                                    ? 'text-negative-600 dark:text-negative-500'
                                    : 'text-ink-500 dark:text-ink-400'
                              }`}
                            >
                              {profitLossPercentage > 0 ? '+' : ''}
                              {formatNumber(profitLossPercentage)}%
                            </p>
                          </div>

                          {/* Modified */}
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                campaign.root.adjustedCostBasis < campaign.root.originalCostBasis
                                  ? 'text-positive-600 dark:text-positive-500'
                                  : 'text-ink-900 dark:text-white'
                              }`}
                            >
                              {formatCurrency(campaign.root.adjustedCostBasis, currencySymbol)}
                            </p>
                            {campaign.root.adjustedCostBasis < campaign.root.originalCostBasis && (
                              <p className="text-xs text-positive-600 dark:text-positive-500">
                                (-
                                {formatCurrency(
                                  campaign.root.originalCostBasis - campaign.root.adjustedCostBasis,
                                  currencySymbol
                                )}
                                )
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Active Options */}
          {campaign.activeOptions.length > 0 &&
            (() => {
              return (
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleActiveOptions(campaign.id);
                    }}
                    className="w-full text-sm font-semibold text-ink-700 dark:text-ink-300 mb-2 flex items-center gap-2 hover:text-ink-900 dark:hover:text-white transition-colors"
                  >
                    {isActiveExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <DollarSign className="w-4 h-4" />
                    {t('widgetsA.active')}{' '}
                    {campaign.type === 'kaching'
                      ? t('widgetsA.activePuts')
                      : campaign.type === 'wheel'
                        ? t('widgetsA.activeOption')
                        : t('widgetsA.activeCalls')}
                    {campaign.type !== 'wheel' && ` (${campaign.activeOptions.length})`}
                  </button>
                  {isActiveExpanded && (
                    <div className="border border-surface-line dark:border-trading-dark-600 rounded-lg overflow-hidden bg-surface dark:bg-trading-dark-800/50">
                      {/* Column Headers */}
                      <div className="px-6 py-2 bg-surface-subtle dark:bg-trading-dark-900/50 border-b border-surface-line dark:border-trading-dark-600">
                        <div
                          className={`grid ${POSITION_GRID_COLS} gap-2 text-xs font-semibold text-ink-600 dark:text-ink-400 items-center`}
                        >
                          <div></div> {/* Icon */}
                          <div>{t('widgetsA.colTicker')}</div>
                          <div>{t('widgetsA.colExpiration')}</div>
                          <div>{t('widgetsA.colStrike')}</div>
                          <div>{t('widgetsA.colStockPrice')}</div>
                          <div>{t('widgetsA.colDifference')}</div>
                          <div>{t('widgetsA.colOpen')}</div>
                          <div>{t('widgetsA.colCurrent')}</div>
                          <div>{t('widgetsA.colProfitLoss')}</div>
                          <div>{t('widgetsA.colCollateral')}</div>
                          <div></div> {/* Spacer */}
                          <div className="text-right">{t('widgetsA.colActions')}</div>{' '}
                          {/* Actions */}
                        </div>
                      </div>
                      {campaign.activeOptions.map((opt) => {
                        // Determine collateral type based on campaign type
                        let collateralType: CollateralType = 'none';
                        let collateralValue = 0;
                        let collateralDescription = '';

                        // LEAPS info for PMCC campaigns
                        let leapsInfo: { ticker: string; expiration: string } | undefined;

                        if (campaign.type === 'covered-call') {
                          collateralType = 'stock';
                          collateralValue = campaign.root.originalCostBasis;
                          collateralDescription = t('widgetsA.coveredCallStockDesc', {
                            kind:
                              campaign.root.position.type === 'stock'
                                ? t('widgetsA.kindShares')
                                : t('widgetsA.kindEtf'),
                            count: campaign.root.quantity,
                          });
                        } else if (campaign.type === 'pmcc') {
                          collateralType = 'leaps';
                          collateralValue = campaign.root.originalCostBasis;
                          collateralDescription = t('widgetsA.coveredCallLeapsDesc');
                          // Get LEAPS ticker and expiration
                          const leapsOption = campaign.root.position as CallOption;
                          leapsInfo = {
                            ticker: leapsOption.ticker,
                            expiration: leapsOption.expiration,
                          };
                        } else if (campaign.type === 'kaching') {
                          collateralType = 'cash';
                          const putOption = opt.position as PutOption;
                          collateralValue = putOption.strike * putOption.contracts * 100;
                          collateralDescription = t('widgetsA.kachingPutDesc', {
                            amount: formatCurrency(collateralValue, currencySymbol),
                          });
                        } else if (campaign.type === 'wheel') {
                          // Wheel can have both Cash Secured Puts (cash) or Covered Calls (stock)
                          if (opt.position.type === 'put') {
                            collateralType = 'cash';
                            const putOption = opt.position as PutOption;
                            collateralValue = putOption.strike * putOption.contracts * 100;
                            collateralDescription = t('widgetsA.wheelCspDesc', {
                              amount: formatCurrency(collateralValue, currencySymbol),
                            });
                          } else if (opt.position.type === 'call') {
                            collateralType = 'stock';
                            collateralValue = campaign.root.originalCostBasis;
                            collateralDescription = t('widgetsA.wheelCallDesc');
                          }
                        }

                        // Get ticker data for this option
                        const tickerData = tickers.find(
                          (t) => t.symbol.toUpperCase() === opt.position.ticker.toUpperCase()
                        );
                        const stockPrice = tickerData?.currentPrice;

                        return (
                          <OptionRow
                            key={opt.position.id}
                            option={opt.position}
                            currencySymbol={currencySymbol}
                            tickerData={tickerData}
                            stockPrice={stockPrice}
                            onRoll={(option) => onRoll(option)}
                            onClose={(option) => onClose(option)}
                            onAssign={(option) => onAssign(option)}
                            onClick={(option) => onView(option)}
                            collateralType={collateralType}
                            collateralValue={collateralValue}
                            collateralDescription={collateralDescription}
                            leapsInfo={leapsInfo}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Opportunity indicator with action button */}
          {campaign.hasOpportunity && (
            <div className="flex items-center justify-between gap-2 p-3 bg-positive-50 dark:bg-positive-700/15 rounded-lg border border-positive-500/20 dark:border-positive-700/30">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-positive-600 dark:text-positive-500 flex-shrink-0" />
                <p className="text-sm text-positive-700 dark:text-positive-500">
                  {campaign.opportunityMessage}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpportunityAction(campaign);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-positive-600 hover:bg-positive-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {campaign.type === 'kaching' ||
                (campaign.type === 'wheel' && campaign.root.type === 'protective-put')
                  ? 'Put'
                  : 'Call'}
              </button>
            </div>
          )}

          {/* History Toggle - always show for Wheel, toggle for others */}
          {campaign.historicalOptions.length > 0 && (
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHistory(campaign.id);
                }}
                className="w-full flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white transition-colors"
              >
                {showingHistory ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <History className="w-4 h-4" />
                {t('widgetsA.history')} ({campaign.historicalOptions.length})
              </button>

              {showingHistory && (
                <div className="mt-3 space-y-2">
                  {campaign.historicalOptions.map((opt, index) => {
                    const option = opt.position;
                    const openPremium = option.premium;
                    const closePremium = (option as any).closePremium || 0;
                    const openValue = openPremium * option.contracts * 100;
                    const closeValue = closePremium * option.contracts * 100;
                    // Determine option type for display
                    const optionType = option.type === 'put' ? 'Put' : 'Call';
                    return (
                      <div
                        key={`${option.id}-${index}`}
                        className="flex items-center p-3 bg-surface-subtle dark:bg-trading-dark-700/50 rounded-lg"
                      >
                        <div className="min-w-[140px] mr-4">
                          <p className="font-medium text-ink-900 dark:text-white">
                            {option.contracts}x ${option.strike} {optionType}
                          </p>
                          <p className="text-xs text-ink-500 dark:text-ink-400">
                            {option.openDate
                              ? new Date(option.openDate).toLocaleDateString('nl-NL')
                              : 'N/A'}{' '}
                            →{' '}
                            {opt.closeDate
                              ? new Date(opt.closeDate).toLocaleDateString('nl-NL')
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="min-w-[80px]">
                          <p className="text-xs text-ink-500 dark:text-ink-400">
                            {t('widgetsA.sold')}
                          </p>
                          <p className="text-sm font-medium text-ink-900 dark:text-white">
                            {formatCurrency(openPremium, currencySymbol)}
                          </p>
                          <p className="text-xs text-ink-500 dark:text-ink-400">
                            {formatCurrency(openValue, currencySymbol)}
                          </p>
                        </div>
                        <div className="min-w-[80px]">
                          <p className="text-xs text-ink-500 dark:text-ink-400">
                            {t('widgetsA.boughtBack')}
                          </p>
                          <p className="text-sm font-medium text-ink-900 dark:text-white">
                            {formatCurrency(closePremium, currencySymbol)}
                          </p>
                          <p className="text-xs text-ink-500 dark:text-ink-400">
                            {formatCurrency(closeValue, currencySymbol)}
                          </p>
                        </div>
                        <div className="flex-1"></div>
                        <div className="min-w-[80px] text-right">
                          <p className="text-xs text-ink-500 dark:text-ink-400">
                            {t('widgetsA.profit')}
                          </p>
                          <p
                            className={`text-sm font-semibold ${
                              (opt.realizedPnL || 0) >= 0
                                ? 'text-positive-600 dark:text-positive-500'
                                : 'text-negative-600 dark:text-negative-500'
                            }`}
                          >
                            {(opt.realizedPnL || 0) >= 0 ? '+' : ''}
                            {formatCurrency(opt.realizedPnL || 0, currencySymbol)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

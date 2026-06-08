import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAppSelector } from './useAppSelector';
import { selectAllTickers } from '../store/slices/tickersSlice';
import { selectUnlockedLevels } from '../store/slices/userProgressSlice';
import { evaluateAllAlerts, type AlertItem } from '../utils/alertEvaluator';
import { filterOpportunitiesByAccess } from '../utils/opportunityGating';

// Single storage key for all dismissed alerts
const DISMISSED_ALERTS_KEY = 'dismissed-alerts';

// Old keys to migrate from
const OLD_KEYS = ['dismissed-portfolio-alerts', 'dismissed-dashboard-alerts'];

// Migrate old localStorage keys to the new single key (runs once)
const migrateOldKeys = (): void => {
  const migrationDone = localStorage.getItem('dismissed-alerts-migrated');
  if (migrationDone) return;

  const allDismissed = new Set<string>();

  // Load from new key first
  const newKeySaved = localStorage.getItem(DISMISSED_ALERTS_KEY);
  if (newKeySaved) {
    try {
      const parsed = JSON.parse(newKeySaved);
      parsed.forEach((id: string) => allDismissed.add(id));
    } catch {
      // Ignore parse errors
    }
  }

  // Merge from old keys
  OLD_KEYS.forEach((oldKey) => {
    const saved = localStorage.getItem(oldKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.forEach((id: string) => allDismissed.add(id));
        // Remove old key after migration
        localStorage.removeItem(oldKey);
      } catch {
        // Ignore parse errors
      }
    }
  });

  // Save merged result
  if (allDismissed.size > 0) {
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...allDismissed]));
  }

  // Mark migration as done
  localStorage.setItem('dismissed-alerts-migrated', 'true');
};

// Run migration on module load
migrateOldKeys();

/**
 * Central hook for managing alerts and opportunities across the app.
 * This is the single source of truth for all alert/opportunity data.
 */
export const useAlerts = (portfolioFilter?: string) => {
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const positions = useAppSelector((state) => state.positions.positions);
  const tickers = useAppSelector(selectAllTickers);
  const unlockedLevels = useAppSelector(selectUnlockedLevels);

  // State to trigger re-renders when alerts are dismissed
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Listen for alerts-updated events
  useEffect(() => {
    const handleAlertsUpdated = () => {
      setUpdateTrigger((prev) => prev + 1);
    };
    window.addEventListener('alerts-updated', handleAlertsUpdated);
    return () => {
      window.removeEventListener('alerts-updated', handleAlertsUpdated);
    };
  }, []);

  // Get dismissed alerts from localStorage
  const dismissedAlerts = useMemo(() => {
    const saved = localStorage.getItem(DISMISSED_ALERTS_KEY);
    if (saved) {
      try {
        return new Set<string>(JSON.parse(saved));
      } catch {
        return new Set<string>();
      }
    }
    return new Set<string>();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateTrigger]);

  // Evaluate all alerts and opportunities using the central evaluator
  const { alerts, opportunities } = useMemo(() => {
    const result = evaluateAllAlerts(
      portfolios,
      positions,
      dismissedAlerts,
      portfolioFilter,
      tickers
    );
    // Level gating: opportunities for not-yet-unlocked strategies are
    // hidden, so a user does not get advice beyond their knowledge level.
    // Alerts (risk on existing positions) always remain visible.
    return {
      alerts: result.alerts,
      opportunities: filterOpportunitiesByAccess(result.opportunities, unlockedLevels),
    };
  }, [portfolios, positions, dismissedAlerts, portfolioFilter, tickers, unlockedLevels]);

  // O(1) position lookup so per-position helpers don't scan the full array each call.
  const positionsById = useMemo(() => {
    const map = new Map<string, (typeof positions)[number]>();
    positions.forEach((p) => map.set(p.id, p));
    return map;
  }, [positions]);

  // Get alerts/opportunities for a specific position by ID
  const getAlertsForPosition = useCallback(
    (positionId: string): AlertItem[] => {
      return alerts.filter((alert) => {
        // Match different alert ID patterns
        // Expiring: expiring-{positionId}
        if (alert.id === `expiring-${positionId}`) return true;
        // Price alerts: {positionId}-{ruleId}
        if (alert.id.startsWith(`${positionId}-`)) return true;
        // Put position alerts: put-position-alert-{positionId}
        if (alert.id === `put-position-alert-${positionId}`) return true;
        // Put spread alerts: put-spread-alert-{spreadId}
        // Call spread alerts: call-spread-alert-{spreadId}
        // Expiring spread alerts: expiring-spread-{spreadId}
        // Position IDs for spread legs are like "spread-123-long" or "spread-123-short"
        const spreadMatch = positionId.match(/^(spread-\d+)/);
        if (spreadMatch) {
          if (alert.id === `put-spread-alert-${spreadMatch[1]}`) return true;
          if (alert.id === `call-spread-alert-${spreadMatch[1]}`) return true;
          if (alert.id === `expiring-spread-${spreadMatch[1]}`) return true;
        }
        return false;
      });
    },
    [alerts]
  );

  const getOpportunitiesForPosition = useCallback(
    (positionId: string): AlertItem[] => {
      const position = positionsById.get(positionId);
      return opportunities.filter((opp) => {
        // Stock CC opportunities are aggregated per ticker+portfolio. Only attach
        // them to the STOCK/ETF position itself — otherwise a LEAPS (or any other
        // position sharing the same ticker+portfolio) would also pick up the stock
        // covered-call message (e.g. it leaked into the LEAPS suggestion tooltip).
        if (
          position &&
          (position.type === 'stock' || position.type === 'etf') &&
          opp.id === `stock-cc-opportunity-${position.ticker}-${position.portfolio}`
        )
          return true;
        // LEAPS CC: leaps-cc-opportunity-{positionId}
        if (opp.id === `leaps-cc-opportunity-${positionId}`) return true;
        // KaChing: kaching-opportunity-{positionId}
        if (opp.id === `kaching-opportunity-${positionId}`) return true;
        // Profit: profit-opportunity-{positionId}
        if (opp.id === `profit-opportunity-${positionId}`) return true;
        return false;
      });
    },
    [opportunities, positionsById]
  );

  // Dismiss an alert
  const dismissAlert = useCallback((alertId: string) => {
    const saved = localStorage.getItem(DISMISSED_ALERTS_KEY);
    let dismissed: string[] = [];
    if (saved) {
      try {
        dismissed = JSON.parse(saved);
      } catch {
        dismissed = [];
      }
    }
    if (!dismissed.includes(alertId)) {
      dismissed.push(alertId);
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(dismissed));
    }
    // Force a re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('alerts-updated'));
  }, []);

  // Get counts per portfolio
  const getPortfolioCounts = useCallback(() => {
    const counts: Record<
      string,
      {
        alerts: number;
        opportunities: number;
        alertItems: AlertItem[];
        opportunityItems: AlertItem[];
      }
    > = {};

    // Initialize for all portfolios
    portfolios.forEach((portfolio) => {
      counts[portfolio.name] = {
        alerts: 0,
        opportunities: 0,
        alertItems: [],
        opportunityItems: [],
      };
    });

    // Count alerts per portfolio
    alerts.forEach((alert) => {
      if (counts[alert.portfolio]) {
        counts[alert.portfolio].alerts++;
        counts[alert.portfolio].alertItems.push(alert);
      }
    });

    // Count opportunities per portfolio
    opportunities.forEach((opp) => {
      if (counts[opp.portfolio]) {
        counts[opp.portfolio].opportunities++;
        counts[opp.portfolio].opportunityItems.push(opp);
      }
    });

    return counts;
  }, [portfolios, alerts, opportunities]);

  // Total counts
  const totalAlerts = alerts.length;
  const totalOpportunities = opportunities.length;

  return {
    alerts,
    opportunities,
    totalAlerts,
    totalOpportunities,
    dismissedAlerts,
    dismissAlert,
    getAlertsForPosition,
    getOpportunitiesForPosition,
    getPortfolioCounts,
  };
};

// Export the storage key for migration
export const DISMISSED_ALERTS_STORAGE_KEY = DISMISSED_ALERTS_KEY;

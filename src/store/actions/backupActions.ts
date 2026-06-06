import type { Dispatch } from 'redux';
import type { BackupData } from '../../utils/backup';
import { loadMockData } from '../slices/portfoliosSlice';
import { loadPositions } from '../slices/positionsSlice';

export const restoreFromBackup = (backup: BackupData) => {
  return (dispatch: Dispatch) => {
    try {
      // Restore portfolios data (including transactions)
      dispatch(
        loadMockData({
          portfolios: backup.data.portfolios.portfolios,
          summaries: backup.data.portfolios.summaries,
          dailyData: backup.data.portfolios.dailyData,
          transactions: backup.data.portfolios.transactions,
        })
      );

      // Restore positions
      if (backup.data.positions) {
        dispatch(loadPositions(backup.data.positions.positions));
      }

      // Restore todos
      if (backup.data.todos) {
        dispatch({ type: 'todos/loadTodos', payload: backup.data.todos.todos });
      }

      // Restore alerts
      if (backup.data.alerts) {
        dispatch({ type: 'alerts/loadAlerts', payload: backup.data.alerts.alerts });
      }

      // Restore journal
      if (backup.data.journal) {
        dispatch({ type: 'journal/loadJournal', payload: backup.data.journal.entries });
      }

      // Restore trades
      if (backup.data.trades) {
        dispatch({ type: 'trades/loadTrades', payload: backup.data.trades.trades });
      }

      // Restore rules
      if (backup.data.rules) {
        dispatch({ type: 'rules/loadRules', payload: backup.data.rules.rules });
      }

      // Restore tickers
      if (backup.data.tickers) {
        dispatch({ type: 'tickers/loadTickers', payload: backup.data.tickers.tickers });
      }

      // Restore strategies
      if (backup.data.strategies) {
        dispatch({ type: 'strategies/loadStrategies', payload: backup.data.strategies.strategies });
      }

      return true;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return false;
    }
  };
};

import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import type { PortfolioName } from '../../types';
import { addDailyData } from '../../store/slices/portfoliosSlice';

const DailyRoutineForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const portfolios = useAppSelector((state) => state.portfolios.summaries);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioName>(portfolios[0]?.portfolio || 'Lynx');
  const [totalValue, setTotalValue] = useState('');
  const [cash, setCash] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !selectedPortfolio || !totalValue || !cash) {
      // Basic validation
      alert('Please fill out all fields.');
      return;
    }

    dispatch(
      addDailyData({
        date,
        portfolio: selectedPortfolio,
        totalValue: parseFloat(totalValue),
        cash: parseFloat(cash),
        dailyPnL: 0, // These will be calculated later
        weeklyPnL: 0,
      })
    );

    // Reset form
    setTotalValue('');
    setCash('');
  };

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Daily Portfolio Update</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="date" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Date
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="portfolio" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Portfolio
            </label>
            <select
              id="portfolio"
              value={selectedPortfolio}
              onChange={(e) => setSelectedPortfolio(e.target.value as PortfolioName)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {portfolios.map((b) => (
                <option key={b.portfolio} value={b.portfolio}>
                  {b.portfolio}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="totalValue" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Total Value
            </label>
            <input
              type="number"
              id="totalValue"
              value={totalValue}
              onChange={(e) => setTotalValue(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="e.g., 150000"
              required
            />
          </div>
          <div>
            <label htmlFor="cash" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Cash
            </label>
            <input
              type="number"
              id="cash"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="e.g., 25000"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-primary-700 dark:hover:bg-primary-800 dark:focus:ring-blue-800"
        >
          Save Daily Data
        </button>
      </form>
    </div>
  );
};

export default DailyRoutineForm;

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, Calendar, ArrowRight } from 'lucide-react';
import { getUserStats } from '../../utils/userManagement';
import type { UserStats } from '../../types/admin';
import { useAdminNavigation } from '../../contexts/AdminNavigationContext';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { setPageTitle } = useAdminNavigation();
  const [stats, setStats] = React.useState<UserStats>({
    totalUsers: 0,
    activeToday: 0,
    activeThisWeek: 0,
  });

  useEffect(() => {
    setPageTitle('Dashboard', 'Welcome to the PayDay administration portal');
    setStats(getUserStats());
  }, [setPageTitle]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary-500/10 dark:bg-primary-700/20 p-3 rounded-lg">
              <Users className="w-6 h-6 text-primary-700 dark:text-primary-300" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="bg-positive-500/10 dark:bg-positive-700/20 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-positive-600 dark:text-positive-500" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Active Today</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.activeToday}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="bg-ink-600/10 dark:bg-ink-600/20 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-ink-600 dark:text-ink-300" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Active This Week</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.activeThisWeek}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary-700 dark:text-primary-300" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">Manage Users</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View, create, and manage user accounts
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

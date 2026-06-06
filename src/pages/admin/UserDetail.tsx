import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Calendar, Clock, Database, Trash2 } from 'lucide-react';
import { getAllUsers, deleteUser, formatDate } from '../../utils/userManagement';
import type { AppUser } from '../../types/admin';
import { useToast } from '../../contexts/ToastContext';
import { useAdminNavigation } from '../../contexts/AdminNavigationContext';

export const UserDetail: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const toast = useToast();
  const { setPageTitle, pushNavigation } = useAdminNavigation();
  const [user, setUser] = useState<AppUser | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userDataSize, setUserDataSize] = useState<number>(0);

  useEffect(() => {
    if (username) {
      loadUser(username);
      calculateUserDataSize(username);
      setPageTitle(username, 'User Details');
      pushNavigation(`/admin/users/${username}`, username);
    }
  }, [username, setPageTitle, pushNavigation]);

  const loadUser = (username: string) => {
    const users = getAllUsers();
    const foundUser = users.find((u) => u.username === username);
    setUser(foundUser || null);
  };

  const calculateUserDataSize = (username: string) => {
    try {
      const userStore = localStorage.getItem(`persist:payday-${username}`);
      if (userStore) {
        // Calculate size in KB
        const sizeInBytes = new Blob([userStore]).size;
        setUserDataSize(Math.round((sizeInBytes / 1024) * 10) / 10); // Round to 1 decimal
      }
    } catch (error) {
      console.error('Failed to calculate user data size:', error);
    }
  };

  const handleDeleteUser = () => {
    if (!username) return;

    try {
      deleteUser(username);
      toast.success(`User "${username}" deleted successfully`);
      navigate('/admin/users');
    } catch (error) {
      toast.error(`Failed to delete user: ${(error as Error).message}`);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg shadow-sm p-6">
          <p className="text-ink-600 dark:text-ink-400">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Information */}
      <div className="bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-ink-900 dark:text-white mb-4">Information</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-surface dark:bg-trading-dark-700/50 rounded-lg">
            <User className="w-5 h-5 text-ink-600 dark:text-ink-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink-700 dark:text-ink-300">Username</p>
              <p className="text-ink-900 dark:text-white">{user.username}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-surface dark:bg-trading-dark-700/50 rounded-lg">
            <Calendar className="w-5 h-5 text-ink-600 dark:text-ink-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink-700 dark:text-ink-300">Created</p>
              <p className="text-ink-900 dark:text-white">{formatDate(user.createdAt)}</p>
              <p className="text-sm text-ink-600 dark:text-ink-400">
                {new Date(user.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-surface dark:bg-trading-dark-700/50 rounded-lg">
            <Clock className="w-5 h-5 text-ink-600 dark:text-ink-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink-700 dark:text-ink-300">Last Login</p>
              <p className="text-ink-900 dark:text-white">{formatDate(user.lastLogin)}</p>
              {user.lastLogin && (
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {new Date(user.lastLogin).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-surface dark:bg-trading-dark-700/50 rounded-lg">
            <Database className="w-5 h-5 text-ink-600 dark:text-ink-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink-700 dark:text-ink-300">Data Size</p>
              <p className="text-ink-900 dark:text-white">{userDataSize} KB</p>
              <p className="text-sm text-ink-600 dark:text-ink-400">LocalStorage usage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-trading-dark-800 border border-negative-500/20 dark:border-negative-700/30 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-negative-600 dark:text-negative-500 mb-4">
          Danger zone
        </h2>
        <div className="flex items-center justify-between p-4 bg-negative-50 dark:bg-negative-700/15 rounded-lg border border-negative-500/20 dark:border-negative-700/30">
          <div>
            <p className="font-medium text-ink-900 dark:text-white">Delete User</p>
            <p className="text-sm text-ink-600 dark:text-ink-400">
              Permanently delete this user and all their data
            </p>
          </div>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-negative-600 text-white rounded-lg hover:bg-negative-700 transition-colors font-medium"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-ink-200 dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300 rounded-lg hover:bg-ink-300 dark:hover:bg-ink-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-negative-600 text-white rounded-lg hover:bg-negative-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete User</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

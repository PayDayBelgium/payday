import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Save, X } from 'lucide-react';
import { getAllUsers } from '../../utils/userManagement';
import type { AppUser } from '../../types/admin';
import { useToast } from '../../contexts/ToastContext';
import { useAdminNavigation } from '../../contexts/AdminNavigationContext';

export const AddUser: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { setPageTitle, pushNavigation } = useAdminNavigation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setPageTitle('Add User', 'Create a new user account');
    pushNavigation('/admin/users/add', 'Add User');
  }, [setPageTitle, pushNavigation]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else {
      // Check if username already exists
      const existingUsers = getAllUsers();
      if (existingUsers.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        newErrors.username = 'Username already exists';
      }
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Create new user in localStorage
      const users = getAllUsers();
      const newUser: AppUser = {
        username: username.trim(),
        createdAt: new Date().toISOString(),
        lastLogin: null,
      };

      users.push(newUser);
      localStorage.setItem('payday-users', JSON.stringify(users));

      // Create empty user store for the new user
      const newUserStore = {
        auth: JSON.stringify({ isAuthenticated: false, user: username.trim() }),
        portfolios: JSON.stringify({ portfolios: [], summaries: [], dailyData: [] }),
        positions: JSON.stringify({ positions: [] }),
        trades: JSON.stringify({ trades: [] }),
        rules: JSON.stringify({ rules: [] }),
      };
      localStorage.setItem(`persist:payday-${username.trim()}`, JSON.stringify(newUserStore));

      toast.success(`User "${username}" created successfully`);
      navigate('/admin/users');
    } catch (error) {
      toast.error(`Failed to create user: ${(error as Error).message}`);
    }
  };

  const handleCancel = () => {
    navigate('/admin/users');
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Card */}
        <div className="bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2"
              >
                Username *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 bg-white dark:bg-trading-dark-700 border ${
                    errors.username
                      ? 'border-negative-500'
                      : 'border-ink-200 dark:border-trading-dark-500'
                  } rounded-lg text-ink-900 dark:text-white placeholder-ink-500 dark:placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Enter username"
                  autoFocus
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-negative-600 dark:text-negative-500">
                  {errors.username}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2"
              >
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 bg-white dark:bg-trading-dark-700 border ${
                    errors.email
                      ? 'border-negative-500'
                      : 'border-ink-200 dark:border-trading-dark-500'
                  } rounded-lg text-ink-900 dark:text-white placeholder-ink-500 dark:placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Enter email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-negative-600 dark:text-negative-500">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2"
              >
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 bg-white dark:bg-trading-dark-700 border ${
                    errors.password
                      ? 'border-negative-500'
                      : 'border-ink-200 dark:border-trading-dark-500'
                  } rounded-lg text-ink-900 dark:text-white placeholder-ink-500 dark:placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Enter password (min. 6 characters)"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-negative-600 dark:text-negative-500">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2"
              >
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 bg-white dark:bg-trading-dark-700 border ${
                    errors.confirmPassword
                      ? 'border-negative-500'
                      : 'border-ink-200 dark:border-trading-dark-500'
                  } rounded-lg text-ink-900 dark:text-white placeholder-ink-500 dark:placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Confirm password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-negative-600 dark:text-negative-500">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white font-medium rounded-lg transition-colors"
          >
            <Save className="w-5 h-5" />
            Create User
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-2 px-6 py-3 bg-surface-muted dark:bg-trading-dark-700 hover:bg-ink-200 dark:hover:bg-trading-dark-600 text-ink-700 dark:text-ink-300 font-medium rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

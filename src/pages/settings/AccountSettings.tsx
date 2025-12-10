import React, { useState } from 'react';
import { Trash2, AlertTriangle, Globe } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { setNationality } from '../../store/slices/authSlice';
import type { NationalityType } from '../../store/slices/authSlice';

export const AccountSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const username = useAppSelector((state) => state.auth.user);
  const nationality = useAppSelector((state) => state.auth.nationality);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleNationalityChange = (value: NationalityType) => {
    dispatch(setNationality(value));
  };

  const handleFullReset = async () => {
    setIsResetting(true);

    // Wait a moment to show the loading message
    await new Promise(resolve => setTimeout(resolve, 300));

    // Clear all localStorage data
    localStorage.clear();

    // Navigate to root to show login page
    window.location.href = '/';
  };

  return (
    <div className="max-w-4xl">
      {/* Account Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account information</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Username:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Storage Key:</span>
            <span className="text-sm font-mono text-gray-900 dark:text-white">payday-{username}</span>
          </div>

          {/* Nationality Setting */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nationaliteit
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Voor belastingregels en rapportage (bijv. Belgische meerwaardebelasting vanaf 2026)
            </p>
            <select
              value={nationality || 'OTHER'}
              onChange={(e) => handleNationalityChange(e.target.value as NationalityType)}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BE">België (BE)</option>
              <option value="NL">Nederland (NL)</option>
              <option value="FR">Frankrijk (FR)</option>
              <option value="DE">Duitsland (DE)</option>
              <option value="US">Verenigde Staten (US)</option>
              <option value="UK">Verenigd Koninkrijk (UK)</option>
              <option value="OTHER">Anders</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800 p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xl font-bold text-red-900 dark:text-red-400 mb-2">Danger zone</h2>
            <p className="text-sm text-red-700 dark:text-red-300">
              These actions are permanent and cannot be undone. Please be careful!
            </p>
          </div>
        </div>

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Full application reset
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-300 dark:border-red-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                ⚠️ This will delete ALL data for ALL users:
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>All portfolio accounts and configurations</li>
                <li>All positions (LEAPs, covered calls, etc.)</li>
                <li>All daily data and history</li>
                <li>All user accounts and login information</li>
                <li>All application settings</li>
              </ul>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-3">
                This action is PERMANENT and CANNOT be undone!
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFullReset}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Yes, delete everything
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Loading Overlay */}
      {isResetting && <LoadingOverlay message="Resetting all data..." />}
    </div>
  );
};

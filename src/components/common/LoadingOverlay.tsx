import React from 'react';
import { Loader2 } from 'lucide-react';
import logo from '../../assets/app/logo.png';

interface LoadingOverlayProps {
  message: string;
  subtitle?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, subtitle }) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center z-[9999]">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 mx-4">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <img src={logo} alt="PayDay" className="w-20 h-20 rounded-lg shadow-md" />

          {/* Spinner */}
          <Loader2 className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin" />

          {/* Messages */}
          <div className="text-center space-y-2">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {message}
            </p>
            {subtitle && (
              <p className="text-base text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

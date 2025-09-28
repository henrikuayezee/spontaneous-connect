/**
 * Professional Loading Screen Component
 * Provides visual feedback during app initialization and data loading
 */

import React from 'react';

interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  showProgress = false,
  progress = 0
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="text-center max-w-md mx-auto px-6">
        {/* App Logo/Brand */}
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"></div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            SpontaneousConnect
          </h1>
          <p className="text-gray-600 text-sm">
            Connecting hearts with perfect timing
          </p>
        </div>

        {/* Loading Spinner */}
        <div className="mb-6">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="mb-6">
          <p className="text-gray-700 font-medium mb-2">{message}</p>

          {/* Progress Bar */}
          {showProgress && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}

          {/* Loading Dots Animation */}
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>

        {/* App Features Preview */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>✨ Intelligent call scheduling</p>
          <p>📱 Multi-platform support</p>
          <p>🔒 Privacy-first design</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
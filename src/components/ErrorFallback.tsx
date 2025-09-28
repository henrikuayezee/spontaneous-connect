/**
 * Professional Error Fallback Component
 * Handles application errors with graceful recovery options
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary
}) => {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  const isAuthError = error.message.includes('auth') || error.message.includes('unauthorized');

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReportError = () => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    const subject = encodeURIComponent('SpontaneousConnect Error Report');
    const body = encodeURIComponent(`
Error Details:
${JSON.stringify(errorInfo, null, 2)}

Please describe what you were doing when this error occurred:
`);

    window.open(`mailto:support@spontaneousconnect.com?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  Oops! Something went wrong
                </h1>
                <p className="text-red-100 text-sm">
                  We're sorry for the inconvenience
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Error Type Specific Messages */}
            {isNetworkError ? (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Network Connection Issue
                </h2>
                <p className="text-gray-600 text-sm">
                  We're having trouble connecting to our servers. Please check your internet connection and try again.
                </p>
              </div>
            ) : isAuthError ? (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Authentication Problem
                </h2>
                <p className="text-gray-600 text-sm">
                  There's an issue with your session. You may need to sign in again.
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Unexpected Error
                </h2>
                <p className="text-gray-600 text-sm">
                  The app encountered an unexpected problem. Our team has been notified and is working on a fix.
                </p>
              </div>
            )}

            {/* Error Details (Development Mode) */}
            {import.meta.env.DEV && (
              <div className="mb-6 p-3 bg-gray-100 rounded-lg">
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Technical Details
                  </summary>
                  <pre className="text-red-600 whitespace-pre-wrap break-words">
                    {error.message}
                  </pre>
                  {error.stack && (
                    <pre className="text-gray-600 whitespace-pre-wrap break-words mt-2 text-xs">
                      {error.stack}
                    </pre>
                  )}
                </details>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={resetErrorBoundary}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                onClick={handleReload}
                className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>

              <button
                onClick={handleGoHome}
                className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg border border-gray-300 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Go to Home</span>
              </button>
            </div>

            {/* Support Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3 text-center">
                Still having trouble?
              </p>
              <button
                onClick={handleReportError}
                className="w-full flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>Report This Error</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              SpontaneousConnect v1.0.0 •
              <span className="ml-1">
                Error ID: {Date.now().toString(36)}
              </span>
            </p>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need immediate help?{' '}
            <a
              href="mailto:support@spontaneousconnect.com"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
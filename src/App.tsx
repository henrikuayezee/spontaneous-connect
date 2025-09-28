/**
 * Main Application Component
 * Enterprise-grade React application with proper error boundaries and state management
 */

import React, { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';

import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { APP_CONFIG } from '@/types';

// Lazy load components for code splitting
const AuthFlow = lazy(() => import('@/components/AuthFlow'));
const MainDashboard = lazy(() => import('@/components/Dashboard'));
const LoadingScreen = lazy(() => import('@/components/LoadingScreen'));
const ErrorFallback = lazy(() => import('@/components/ErrorFallback'));

// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: APP_CONFIG.CACHE_DURATION,
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < APP_CONFIG.MAX_RETRY_ATTEMPTS;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// PWA update notification component
const PWAUpdateNotification: React.FC = () => {
  // This would integrate with workbox for PWA updates
  // For now, it's a placeholder
  return null;
};

// Performance monitoring component
const PerformanceMonitor: React.FC = () => {
  React.useEffect(() => {
    // Monitor Core Web Vitals
    if ('web-vital' in window) {
      // Integration with web-vitals library would go here
      logger.logPerformance('app_loaded', performance.now());
    }

    // Monitor memory usage
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      logger.info('Memory usage', {
        component: 'PerformanceMonitor',
        action: 'memoryCheck',
        metadata: {
          usedJSHeapSize: memoryInfo.usedJSHeapSize,
          totalJSHeapSize: memoryInfo.totalJSHeapSize,
          jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
        },
      });
    }
  }, []);

  return null;
};

// Main application component
const AppContent: React.FC = () => {
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    clearError,
  } = useAuth();

  // Log app initialization
  React.useEffect(() => {
    logger.info('App initialized', {
      component: 'App',
      action: 'initialize',
      metadata: {
        version: APP_CONFIG.VERSION,
        environment: import.meta.env.MODE,
        timestamp: new Date().toISOString(),
      },
    });
  }, []);

  // Handle authentication errors
  React.useEffect(() => {
    if (error) {
      logger.error('Authentication error in App', {
        component: 'App',
        action: 'authError',
        metadata: { error },
      });
    }
  }, [error]);

  // Loading state
  if (isLoading) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <LoadingScreen message="Initializing SpontaneousConnect..." />
      </Suspense>
    );
  }

  // Authentication flow
  if (!isAuthenticated || !user) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <AuthFlow
          onSignIn={signIn}
          onSignUp={signUp}
          error={error}
          onClearError={clearError}
        />
      </Suspense>
    );
  }

  // Main application
  return (
    <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
      <MainDashboard
        user={user}
        onSignOut={signOut}
        onUpdateProfile={updateProfile}
      />
    </Suspense>
  );
};

// Error boundary error handler
const handleError = (error: Error, errorInfo: { componentStack: string }) => {
  logger.logReactError(error, errorInfo);

  // Send to monitoring service in production
  if (import.meta.env.PROD) {
    // Integration with Sentry or similar service
    console.error('React Error Boundary:', error, errorInfo);
  }
};

// Main App wrapper with providers
const App: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <Suspense fallback={<div>Loading error handler...</div>}>
          <ErrorFallback
            error={error}
            resetErrorBoundary={resetErrorBoundary}
          />
        </Suspense>
      )}
      onError={handleError}
      onReset={() => {
        // Clear any cached data and reload
        window.location.reload();
      }}
    >
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          {/* Performance monitoring */}
          <PerformanceMonitor />

          {/* PWA update notifications */}
          <PWAUpdateNotification />

          {/* Main app content */}
          <AppContent />

          {/* Development tools */}
          {import.meta.env.DEV && (
            <ReactQueryDevtools
              initialIsOpen={false}
              position="bottom-right"
            />
          )}
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

/**
 * Application Entry Point
 * Professional setup with performance monitoring and error handling
 */

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { logger } from './lib/logger';

// Performance monitoring
const startTime = performance.now();

// Service Worker registration for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        logger.info('Service Worker registered', {
          component: 'ServiceWorker',
          action: 'register',
          metadata: { scope: registration.scope }
        });
      })
      .catch((error) => {
        logger.error('Service Worker registration failed', {
          component: 'ServiceWorker',
          action: 'registerFailed',
          metadata: { error }
        });
      });
  });
}

// Initialize app
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);

// Render app with performance monitoring
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Log initialization performance
const initTime = performance.now() - startTime;
logger.logPerformance('app_initialization', initTime, {
  component: 'main',
  metadata: {
    environment: import.meta.env.MODE,
    timestamp: new Date().toISOString()
  }
});

// Handle unhandled promise rejections globally
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    component: 'GlobalErrorHandler',
    action: 'unhandledRejection',
    metadata: {
      reason: event.reason,
      promise: event.promise
    }
  });
});

// Log successful initialization
logger.info('SpontaneousConnect initialized successfully', {
  component: 'main',
  action: 'initialize',
  metadata: {
    initTime,
    environment: import.meta.env.MODE,
    version: '1.0.0'
  }
});

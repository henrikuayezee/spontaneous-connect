import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

class MonitoringService {
    private static instance: MonitoringService;
    private initialized = false;

    private constructor() { }

    public static getInstance(): MonitoringService {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }

    public init(): void {
        if (this.initialized) return;

        if (SENTRY_DSN) {
            Sentry.init({
                dsn: SENTRY_DSN,
                integrations: [
                    Sentry.browserTracingIntegration(),
                    Sentry.replayIntegration(),
                ],
                // Performance Monitoring
                tracesSampleRate: 1.0, // Capture 100% of the transactions
                // Session Replay
                replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
                replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when an error occurs.
            });
            this.initialized = true;
        } else {
            console.warn('Sentry DSN not found, monitoring disabled');
        }
    }

    public captureException(error: any, context?: Record<string, any>): void {
        if (!this.initialized) return;

        Sentry.withScope((scope) => {
            if (context) {
                scope.setContext('additional', context);
            }
            Sentry.captureException(error);
        });
    }

    public setUser(user: { id: string; email?: string; username?: string } | null): void {
        if (!this.initialized) return;
        Sentry.setUser(user);
    }
}

export const monitoring = MonitoringService.getInstance();

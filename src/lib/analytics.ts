import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_dummy_key';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

class AnalyticsService {
    private static instance: AnalyticsService;
    private initialized = false;

    private constructor() { }

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    public init(): void {
        if (this.initialized) return;

        try {
            posthog.init(POSTHOG_KEY, {
                api_host: POSTHOG_HOST,
                autocapture: false, // We want manual control over what we track
                capture_pageview: false, // We'll track pageviews manually if needed
                persistence: 'localStorage'
            });
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize analytics', error);
        }
    }

    public identify(userId: string, properties?: Record<string, any>): void {
        if (!this.initialized) return;
        posthog.identify(userId, properties);
    }

    public track(eventName: string, properties?: Record<string, any>): void {
        if (!this.initialized) return;
        posthog.capture(eventName, properties);
    }

    public reset(): void {
        if (!this.initialized) return;
        posthog.reset();
    }
}

export const analytics = AnalyticsService.getInstance();

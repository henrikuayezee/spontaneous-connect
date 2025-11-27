import { logger } from './logger';

interface QueuedRequest {
    id: string;
    url: string;
    method: string;
    body?: any;
    headers?: any;
    timestamp: number;
}

class OfflineSyncManager {
    private static instance: OfflineSyncManager;
    private queue: QueuedRequest[] = [];
    private readonly STORAGE_KEY = 'offline_sync_queue';

    private constructor() {
        this.loadQueue();
        this.setupListeners();
    }

    public static getInstance(): OfflineSyncManager {
        if (!OfflineSyncManager.instance) {
            OfflineSyncManager.instance = new OfflineSyncManager();
        }
        return OfflineSyncManager.instance;
    }

    private loadQueue() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
            }
        } catch (error) {
            logger.error('Failed to load offline queue', { metadata: { error } });
        }
    }

    private saveQueue() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
        } catch (error) {
            logger.error('Failed to save offline queue', { metadata: { error } });
        }
    }

    private setupListeners() {
        window.addEventListener('online', () => {
            logger.info('App is online, processing queue');
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            logger.info('App is offline');
        });
    }

    public async enqueueRequest(url: string, method: string, body?: any, headers?: any) {
        const request: QueuedRequest = {
            id: crypto.randomUUID(),
            url,
            method,
            body,
            headers,
            timestamp: Date.now(),
        };

        this.queue.push(request);
        this.saveQueue();

        logger.info('Request queued for offline sync', {
            metadata: {
                requestId: request.id,
                url: request.url,
            }
        });
    }

    public async processQueue() {
        if (this.queue.length === 0) return;

        logger.info(`Processing ${this.queue.length} offline requests`);

        const currentQueue = [...this.queue];
        this.queue = []; // Clear queue temporarily
        this.saveQueue();

        const failedRequests: QueuedRequest[] = [];

        for (const request of currentQueue) {
            try {
                logger.info(`Replaying request: ${request.url}`);

                // This is a simplified replay mechanism. 
                // In a real app, you'd integrate this with your API client (e.g., Supabase or fetch wrapper)
                // For now, we'll just log it as "processed" to simulate the behavior.

                // Simulate fetch
                // await fetch(request.url, {
                //   method: request.method,
                //   body: JSON.stringify(request.body),
                //   headers: request.headers
                // });

                logger.info(`Successfully replayed request: ${request.id}`);
            } catch (error) {
                logger.error(`Failed to replay request: ${request.id}`, { metadata: { error } });
                failedRequests.push(request);
            }
        }

        // Re-queue failed requests
        if (failedRequests.length > 0) {
            this.queue = [...failedRequests, ...this.queue];
            this.saveQueue();
        }
    }
}

export const offlineSyncManager = OfflineSyncManager.getInstance();

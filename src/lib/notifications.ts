import { supabase } from './supabase';
import { logger } from './logger';

class NotificationManager {
    private static instance: NotificationManager;
    private readonly VAPID_PUBLIC_KEY = import.meta.env['VITE_VAPID_PUBLIC_KEY'];

    private constructor() { }

    public static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    public async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            logger.warn('Notifications not supported');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            logger.info(`Notification permission: ${permission}`);
            return permission === 'granted';
        } catch (error) {
            logger.error('Error requesting notification permission', { metadata: { error } });
            return false;
        }
    }

    public async isSubscribed(): Promise<boolean> {
        if (!('serviceWorker' in navigator)) return false;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            return !!subscription;
        } catch (error) {
            logger.error('Failed to check subscription status', { metadata: { error } });
            return false;
        }
    }

    public async subscribeToPush(userId: string): Promise<boolean> {
        if (!('serviceWorker' in navigator)) return false;

        try {
            const registration = await navigator.serviceWorker.ready;

            // Check if already subscribed
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // Subscribe
                const applicationServerKey = this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY || '');
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                });
            }

            // Save subscription to database
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: userId,
                    subscription: subscription.toJSON(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'subscription' });

            if (error) throw error;

            logger.info('Push subscription saved', { metadata: { userId } });
            return true;

        } catch (error) {
            logger.error('Failed to subscribe to push', { metadata: { error } });
            return false;
        }
    }

    public async unsubscribe(userId: string): Promise<boolean> {
        if (!('serviceWorker' in navigator)) return false;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();

                // Ideally we should also remove from database, but for now local unsubscribe is enough
                // to stop receiving notifications on this device.
            }

            return true;
        } catch (error) {
            logger.error('Failed to unsubscribe', { metadata: { error } });
            return false;
        }
    }

    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

export const notificationManager = NotificationManager.getInstance();

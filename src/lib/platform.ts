import { Platform } from '@/types';
import { logger } from './logger';

export interface PlatformContext {
    phone?: string;
    partnerName: string;
    message?: string;
    username?: string; // For Telegram/Discord if we add support later
}

class PlatformService {
    private static instance: PlatformService;

    private constructor() { }

    public static getInstance(): PlatformService {
        if (!PlatformService.instance) {
            PlatformService.instance = new PlatformService();
        }
        return PlatformService.instance;
    }

    public openPlatform(platform: Platform, context: PlatformContext): void {
        try {
            const url = this.generateUrl(platform, context);

            logger.info('Opening platform', {
                component: 'PlatformService',
                action: 'openPlatform',
                metadata: { platform, url }
            });

            window.open(url, '_blank');
        } catch (error) {
            logger.error('Failed to open platform', {
                component: 'PlatformService',
                action: 'openPlatform',
                metadata: { error, platform }
            });
            throw error;
        }
    }

    private generateUrl(platform: Platform, context: PlatformContext): string {
        const { phone, partnerName, message } = context;
        const cleanPhone = phone?.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(message || `Hey ${partnerName}! 😊`);

        switch (platform) {
            case Platform.PHONE:
                if (!cleanPhone) throw new Error('Phone number required for calls');
                return `tel:${cleanPhone}`;

            case Platform.SMS:
                if (!cleanPhone) throw new Error('Phone number required for SMS');
                return `sms:${cleanPhone}?body=${encodedMessage}`;

            case Platform.WHATSAPP:
                if (cleanPhone) {
                    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
                }
                return 'whatsapp://';

            case Platform.TELEGRAM:
                // If we had a username, we'd use https://t.me/${username}
                // For now, just open the app/web
                return 'https://telegram.org/dl';

            case Platform.DISCORD:
                // Ideally https://discord.com/users/${userId}
                return 'https://discord.com/app';

            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
}

export const platformService = PlatformService.getInstance();

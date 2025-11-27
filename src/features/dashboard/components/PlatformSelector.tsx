import React from 'react';
import { Platform } from '@/types';
import { Phone, MessageCircle, Smartphone, Send, MessagesSquare } from 'lucide-react';

interface PlatformSelectorProps {
    selectedPlatform: Platform;
    onSelect: (platform: Platform) => void;
    availablePlatforms: Platform[];
}

const PLATFORM_CONFIG: Record<Platform, { label: string; icon: React.ElementType; color: string }> = {
    [Platform.PHONE]: { label: 'Phone Call', icon: Phone, color: 'bg-green-100 text-green-600' },
    [Platform.WHATSAPP]: { label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-100 text-green-600' },
    [Platform.SMS]: { label: 'SMS', icon: Smartphone, color: 'bg-blue-100 text-blue-600' },
    [Platform.TELEGRAM]: { label: 'Telegram', icon: Send, color: 'bg-blue-100 text-blue-600' },
    [Platform.DISCORD]: { label: 'Discord', icon: MessagesSquare, color: 'bg-indigo-100 text-indigo-600' },
};

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
    selectedPlatform,
    onSelect,
    availablePlatforms,
}) => {
    return (
        <div className="flex flex-wrap gap-2 justify-center">
            {availablePlatforms.map((platform) => {
                const config = PLATFORM_CONFIG[platform];
                const Icon = config.icon;
                const isSelected = selectedPlatform === platform;

                return (
                    <button
                        key={platform}
                        onClick={() => onSelect(platform)}
                        className={`
              flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-200
              ${isSelected
                                ? 'bg-gray-900 text-white shadow-md scale-105'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }
            `}
                    >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : ''}`} />
                        <span className="text-sm font-medium">{config.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

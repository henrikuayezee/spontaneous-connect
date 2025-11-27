import React, { useState, useEffect } from 'react';
import { User, Platform } from '@/types';
import { Phone, Clock, X, Check } from 'lucide-react';
import { PlatformSelector } from './PlatformSelector';
import { format } from 'date-fns';

interface CallInterfaceProps {
    partnerName: string;
    partnerPhone?: string;
    scheduledTime: Date;
    preferredPlatforms: Platform[];
    onCallInitiated: (platform: Platform) => void;
    onSnooze: () => void;
    onSkip: () => void;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({
    partnerName,
    partnerPhone,
    scheduledTime,
    preferredPlatforms,
    onCallInitiated,
    onSnooze,
    onSkip,
}) => {
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>(preferredPlatforms[0] || Platform.PHONE);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const diff = scheduledTime.getTime() - now.getTime();

            if (diff < 0) {
                setIsOverdue(true);
                setTimeLeft('Now');
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [scheduledTime]);

    return (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 max-w-md w-full mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                <div className="relative z-10">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-4 flex items-center justify-center text-4xl shadow-inner">
                        {partnerName.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-2xl font-bold mb-1">Time to connect with</h2>
                    <h1 className="text-3xl font-extrabold tracking-tight">{partnerName}</h1>

                    <div className="mt-4 inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        <span>{isOverdue ? 'Overdue' : `Starts in ${timeLeft}`}</span>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-8">
                <div className="text-center space-y-2">
                    <p className="text-gray-500 text-sm uppercase tracking-wide font-semibold">Choose how to connect</p>
                    <PlatformSelector
                        selectedPlatform={selectedPlatform}
                        onSelect={setSelectedPlatform}
                        availablePlatforms={preferredPlatforms}
                    />
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => onCallInitiated(selectedPlatform)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white text-lg font-bold py-4 rounded-2xl shadow-lg shadow-green-500/30 transform transition-all active:scale-95 flex items-center justify-center space-x-3"
                    >
                        <Phone className="w-6 h-6" />
                        <span>Call Now</span>
                    </button>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={onSnooze}
                            className="flex items-center justify-center space-x-2 py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors"
                        >
                            <Clock className="w-5 h-5" />
                            <span>Snooze</span>
                        </button>
                        <button
                            onClick={onSkip}
                            className="flex items-center justify-center space-x-2 py-3 px-4 bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-xl font-medium transition-colors"
                        >
                            <X className="w-5 h-5" />
                            <span>Skip</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

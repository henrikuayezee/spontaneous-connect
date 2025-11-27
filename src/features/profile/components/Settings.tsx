import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, LogOut, Loader2, Bell, BellOff } from 'lucide-react';
import { User } from '@/types';
import { notificationManager } from '@/lib/notifications';

const PushToggle: React.FC<{ userId: string }> = ({ userId }) => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        const subscribed = await notificationManager.isSubscribed();
        setIsEnabled(subscribed);
        setIsLoading(false);
    };

    const toggleNotifications = async () => {
        setIsLoading(true);
        try {
            if (isEnabled) {
                await notificationManager.unsubscribe(userId);
                setIsEnabled(false);
            } else {
                const granted = await notificationManager.requestPermission();
                if (granted) {
                    const success = await notificationManager.subscribeToPush(userId);
                    if (success) setIsEnabled(true);
                }
            }
        } catch (error) {
            console.error('Failed to toggle notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;
    }

    return (
        <button
            type="button"
            onClick={toggleNotifications}
            className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'}
            `}
        >
            <span className="sr-only">Use setting</span>
            <span
                aria-hidden="true"
                className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    );
};

const settingsSchema = z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
    partnerName: z.string().min(1, 'Partner name is required').max(50, 'Name is too long'),
    partnerPhone: z.string().optional(),
    dailyCallLimit: z.number().min(1).max(10),
    activeDays: z.array(z.string()).min(1, 'Select at least one day'),
    morningStart: z.string(),
    eveningEnd: z.string(),
    preferredPlatforms: z.array(z.string()).min(1, 'Select at least one platform'),
    timezone: z.string(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsProps {
    user: User;
    onUpdateProfile: (updates: Partial<User>) => Promise<void>;
    onSignOut: () => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({
    user,
    onUpdateProfile,
    onSignOut
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isDirty }
    } = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            name: user.name,
            partnerName: user.partner_name,
            partnerPhone: user.partner_phone || '',
            dailyCallLimit: user.daily_call_limit,
            activeDays: user.active_days.split(','),
            morningStart: user.morning_start,
            eveningEnd: user.evening_end,
            preferredPlatforms: user.preferred_platforms.split(','),
            timezone: user.timezone,
        }
    });

    const onSubmit = async (data: SettingsFormData) => {
        try {
            setIsSaving(true);
            setSaveMessage(null);

            await onUpdateProfile({
                name: data.name,
                partner_name: data.partnerName,
                partner_phone: data.partnerPhone || undefined,
                daily_call_limit: data.dailyCallLimit,
                active_days: data.activeDays.join(','),
                morning_start: data.morningStart,
                evening_end: data.eveningEnd,
                preferred_platforms: data.preferredPlatforms.join(','),
                timezone: data.timezone,
            });

            setSaveMessage({ type: 'success', text: 'Settings saved successfully' });

            // Clear success message after 3 seconds
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error) {
            setSaveMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
                <button
                    onClick={onSignOut}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center space-x-1"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
                {/* Status Message */}
                {saveMessage && (
                    <div className={`p-4 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {saveMessage.text}
                    </div>
                )}

                {/* Personal Info */}
                <section className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Personal Details
                    </h3>
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Your Name
                            </label>
                            <input
                                {...register('name')}
                                className="form-input"
                            />
                            {errors.name && (
                                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Partner's Name
                            </label>
                            <input
                                {...register('partnerName')}
                                className="form-input"
                            />
                            {errors.partnerName && (
                                <p className="text-red-500 text-xs mt-1">{errors.partnerName.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Partner's Phone
                            </label>
                            <input
                                {...register('partnerPhone')}
                                type="tel"
                                className="form-input"
                            />
                        </div>
                    </div>
                </section>

                {/* Scheduling Constraints */}
                <section className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Scheduling Constraints
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Daily Call Limit: {watch('dailyCallLimit')}
                        </label>
                        <input
                            {...register('dailyCallLimit', { valueAsNumber: true })}
                            type="range"
                            min="1"
                            max="10"
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>1 call</span>
                            <span>10 calls</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Morning Start
                            </label>
                            <input
                                {...register('morningStart')}
                                type="time"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Evening End
                            </label>
                            <input
                                {...register('eveningEnd')}
                                type="time"
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Active Days
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                <label key={day} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        value={day}
                                        {...register('activeDays')}
                                        className="sr-only"
                                    />
                                    <div className={`
                    px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors
                    ${watch('activeDays').includes(day)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }
                  `}>
                                        {day}
                                    </div>
                                </label>
                            ))}
                        </div>
                        {errors.activeDays && (
                            <p className="text-red-500 text-xs mt-1">{errors.activeDays.message}</p>
                        )}
                    </div>
                </section>

                {/* Platforms */}
                <section className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Communication Methods
                    </h3>
                    <div className="space-y-2">
                        {[
                            { value: 'phone', label: 'Phone Call', icon: '📞' },
                            { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                            { value: 'sms', label: 'Text Message', icon: '📱' },
                        ].map((platform) => (
                            <label key={platform.value} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                                <input
                                    type="checkbox"
                                    value={platform.value}
                                    {...register('preferredPlatforms')}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xl">{platform.icon}</span>
                                <span className="text-sm font-medium text-gray-700">
                                    {platform.label}
                                </span>
                            </label>
                        ))}
                    </div>
                    {errors.preferredPlatforms && (
                        <p className="text-red-500 text-xs mt-1">{errors.preferredPlatforms.message}</p>
                    )}
                </section>

                {/* Notifications */}
                <section className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Notifications
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center space-x-3">
                            <span className="text-xl">🔔</span>
                            <div>
                                <p className="font-medium text-gray-900">Push Notifications</p>
                                <p className="text-sm text-gray-500">Get notified about upcoming calls</p>
                            </div>
                        </div>
                        <PushToggle userId={user.id} />
                    </div>
                </section>

                {/* Save Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSaving || !isDirty}
                        className="w-full btn btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

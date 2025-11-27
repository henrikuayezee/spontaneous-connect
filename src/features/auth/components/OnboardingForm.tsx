import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const onboardingSchema = z.object({
    name: z.string().min(1, 'Your name is required').max(50, 'Name is too long'),
    partnerName: z.string().min(1, 'Partner name is required').max(50, 'Name is too long'),
    partnerPhone: z.string().optional(),
    dailyCallLimit: z.number().min(1).max(10),
    activeDays: z.array(z.string()).min(1, 'Select at least one day'),
    morningStart: z.string(),
    eveningEnd: z.string(),
    preferredPlatforms: z.array(z.string()).min(1, 'Select at least one platform'),
    timezone: z.string(),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface OnboardingFormProps {
    onSubmit: (data: OnboardingFormData) => void;
    onBack: () => void;
    isLoading: boolean;
}

export const OnboardingForm: React.FC<OnboardingFormProps> = ({
    onSubmit,
    onBack,
    isLoading
}) => {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors }
    } = useForm<OnboardingFormData>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            name: '',
            partnerName: '',
            partnerPhone: '',
            dailyCallLimit: 3,
            activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            morningStart: '09:00',
            eveningEnd: '21:00',
            preferredPlatforms: ['phone', 'whatsapp'],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            <div className="space-y-6">
                {/* Personal Information */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Personal Information
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Your Name
                            </label>
                            <input
                                {...register('name')}
                                type="text"
                                className="form-input"
                                placeholder="What should we call you?"
                            />
                            {errors.name && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Partner's Name
                            </label>
                            <input
                                {...register('partnerName')}
                                type="text"
                                className="form-input"
                                placeholder="Your partner's name"
                            />
                            {errors.partnerName && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.partnerName.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Partner's Phone (Optional)
                            </label>
                            <input
                                {...register('partnerPhone')}
                                type="tel"
                                className="form-input"
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>
                    </div>
                </div>

                {/* Call Preferences */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Call Preferences
                    </h3>
                    <div className="space-y-4">
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
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
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

                        {/* Active Days */}
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
                        </div>

                        {/* Platforms */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Preferred Platforms
                            </label>
                            <div className="space-y-2">
                                {[
                                    { value: 'phone', label: 'Phone Call', icon: '📞' },
                                    { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                                    { value: 'sms', label: 'Text Message', icon: '📱' },
                                ].map((platform) => (
                                    <label key={platform.value} className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            value={platform.value}
                                            {...register('preferredPlatforms')}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-lg">{platform.icon}</span>
                                        <span className="text-sm font-medium text-gray-700">
                                            {platform.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex space-x-3 mt-8">
                <button
                    type="button"
                    onClick={onBack}
                    className="btn btn-secondary flex-1"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary flex-1"
                >
                    {isLoading ? 'Creating Account...' : 'Complete Setup'}
                </button>
            </div>
        </form>
    );
};

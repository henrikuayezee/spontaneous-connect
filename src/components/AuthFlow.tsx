/**
 * Professional Authentication Flow Component
 * Handles sign-in, sign-up, and onboarding with smooth transitions
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Heart, Shield, Clock, Smartphone } from 'lucide-react';
import { User } from '@/types';

interface AuthFlowProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  error: string | null;
  onClearError: () => void;
}

type AuthMode = 'signin' | 'signup' | 'onboarding';

// Validation schemas
const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

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

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;
type OnboardingForm = z.infer<typeof onboardingSchema>;

const AuthFlow: React.FC<AuthFlowProps> = ({
  onSignIn,
  onSignUp,
  error,
  onClearError
}) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signUpData, setSignUpData] = useState<SignUpForm | null>(null);

  // Form hooks
  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' }
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' }
  });

  const onboardingForm = useForm<OnboardingForm>({
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

  const handleSignIn = async (data: SignInForm) => {
    try {
      setIsLoading(true);
      onClearError();
      await onSignIn(data.email, data.password);
    } catch (error) {
      // Error handled by parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (data: SignUpForm) => {
    setSignUpData(data);
    setMode('onboarding');
  };

  const handleOnboardingSubmit = async (data: OnboardingForm) => {
    if (!signUpData) return;

    try {
      setIsLoading(true);
      onClearError();

      const userData: Partial<User> = {
        name: data.name,
        partner_name: data.partnerName,
        partner_phone: data.partnerPhone || undefined,
        daily_call_limit: data.dailyCallLimit,
        active_days: data.activeDays.join(','),
        morning_start: data.morningStart,
        evening_end: data.eveningEnd,
        preferred_platforms: data.preferredPlatforms.join(','),
        timezone: data.timezone,
      };

      await onSignUp(signUpData.email, signUpData.password, userData);
    } catch (error) {
      // Error handled by parent component
    } finally {
      setIsLoading(false);
    }
  };

  const resetToSignIn = () => {
    setMode('signin');
    setSignUpData(null);
    onClearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="max-w-md w-full">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SpontaneousConnect
          </h1>
          <p className="text-gray-600">
            {mode === 'signin' && 'Welcome back! Sign in to continue.'}
            {mode === 'signup' && 'Join thousands of couples connecting better.'}
            {mode === 'onboarding' && 'Let\'s personalize your experience.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6 mb-0">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    onClick={onClearError}
                    className="text-red-400 hover:text-red-600 text-xs mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' && (
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    {...signInForm.register('email')}
                    type="email"
                    className="form-input"
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...signInForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="form-input pr-10"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {signInForm.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full mt-6"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Sign Up Form */}
          {mode === 'signup' && (
            <form onSubmit={signUpForm.handleSubmit(handleSignUpSubmit)} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    {...signUpForm.register('email')}
                    type="email"
                    className="form-input"
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    {...signUpForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    {...signUpForm.register('confirmPassword')}
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                  />
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full mt-6"
              >
                Continue to Setup
              </button>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={resetToSignIn}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Onboarding Form */}
          {mode === 'onboarding' && (
            <form onSubmit={onboardingForm.handleSubmit(handleOnboardingSubmit)} className="p-6">
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
                        {...onboardingForm.register('name')}
                        type="text"
                        className="form-input"
                        placeholder="What should we call you?"
                      />
                      {onboardingForm.formState.errors.name && (
                        <p className="text-red-500 text-xs mt-1">
                          {onboardingForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Partner's Name
                      </label>
                      <input
                        {...onboardingForm.register('partnerName')}
                        type="text"
                        className="form-input"
                        placeholder="Your partner's name"
                      />
                      {onboardingForm.formState.errors.partnerName && (
                        <p className="text-red-500 text-xs mt-1">
                          {onboardingForm.formState.errors.partnerName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Partner's Phone (Optional)
                      </label>
                      <input
                        {...onboardingForm.register('partnerPhone')}
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
                        Daily Call Limit: {onboardingForm.watch('dailyCallLimit')}
                      </label>
                      <input
                        {...onboardingForm.register('dailyCallLimit', { valueAsNumber: true })}
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
                          {...onboardingForm.register('morningStart')}
                          type="time"
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Evening End
                        </label>
                        <input
                          {...onboardingForm.register('eveningEnd')}
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
                              {...onboardingForm.register('activeDays')}
                              className="sr-only"
                            />
                            <div className={`
                              px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors
                              ${onboardingForm.watch('activeDays').includes(day)
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
                              {...onboardingForm.register('preferredPlatforms')}
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
                  onClick={() => setMode('signup')}
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
          )}

          {/* Features Preview */}
          {mode === 'signin' && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Smart Timing</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Smartphone className="w-3 h-3" />
                  <span>Multi-Platform</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Terms and Privacy */}
        <div className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-700">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-700">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthFlow;
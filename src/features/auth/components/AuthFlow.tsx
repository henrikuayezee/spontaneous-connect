import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { User } from '@/types';
import { SignInForm } from './SignInForm';
import { SignUpForm, SignUpFormData } from './SignUpForm';
import { OnboardingForm, OnboardingFormData } from './OnboardingForm';

interface AuthFlowProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  error: string | null;
  onClearError: () => void;
}

type AuthMode = 'signin' | 'signup' | 'onboarding';

const AuthFlow: React.FC<AuthFlowProps> = ({
  onSignIn,
  onSignUp,
  error,
  onClearError
}) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [tempAuth, setTempAuth] = useState<{ email: string; password: string } | null>(null);

  const handleSignIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      onClearError();
      await onSignIn(email, password);
    } catch (err) {
      // Error is handled by parent and passed via props
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpStep1 = (data: SignUpFormData) => {
    setTempAuth({ email: data.email, password: data.password });
    setMode('onboarding');
    onClearError();
  };

  const handleOnboardingSubmit = async (data: OnboardingFormData) => {
    if (!tempAuth) return;

    try {
      setIsLoading(true);
      onClearError();

      await onSignUp(tempAuth.email, tempAuth.password, {
        name: data.name,
        partner_name: data.partnerName,
        partner_phone: data.partnerPhone,
        daily_call_limit: data.dailyCallLimit,
        active_days: data.activeDays.join(','),
        morning_start: data.morningStart,
        evening_end: data.eveningEnd,
        preferred_platforms: data.preferredPlatforms.join(','),
        timezone: data.timezone,
      });
    } catch (err) {
      // Error is handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            SpontaneousConnect
          </h1>
          <p className="text-blue-100">
            Keep the spark alive with spontaneous calls
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={onClearError}
              className="text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Content */}
        {mode === 'signin' && (
          <SignInForm
            onSignIn={handleSignIn}
            onSwitchMode={() => {
              setMode('signup');
              onClearError();
            }}
            isLoading={isLoading}
          />
        )}

        {mode === 'signup' && (
          <SignUpForm
            onSignUpSubmit={handleSignUpStep1}
            onSwitchMode={() => {
              setMode('signin');
              onClearError();
            }}
            isLoading={isLoading}
          />
        )}

        {mode === 'onboarding' && (
          <OnboardingForm
            onSubmit={handleOnboardingSubmit}
            onBack={() => setMode('signup')}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default AuthFlow;
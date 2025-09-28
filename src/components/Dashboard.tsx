/**
 * Main Dashboard Component
 * Professional interface for call scheduling and management
 */

import React, { useState, useEffect } from 'react';
import {
  Phone,
  MessageCircle,
  Clock,
  SkipForward,
  Settings,
  History,
  Heart,
  Plus,
  Calendar,
  TrendingUp,
  User,
  LogOut
} from 'lucide-react';
import { User as UserType, Platform } from '@/types';
import { useScheduler } from '@/hooks/useScheduler';
import { logger } from '@/lib/logger';

interface DashboardProps {
  user: UserType;
  onSignOut: () => Promise<void>;
  onUpdateProfile: (updates: Partial<UserType>) => Promise<void>;
}

type ViewMode = 'home' | 'schedule' | 'history' | 'settings';

const Dashboard: React.FC<DashboardProps> = ({
  user,
  onSignOut,
  onUpdateProfile
}) => {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    nextCallTime,
    timeUntilCall,
    callsToday,
    scheduleHelper,
    generateNextCall,
    markCallAttempted,
    rescheduleCall,
    refreshSchedule,
    error: schedulerError,
    clearError: clearSchedulerError
  } = useScheduler(user);

  // Log user activity
  useEffect(() => {
    logger.logUserAction('dashboard_viewed', user.id, {
      currentView,
      hasNextCall: !!nextCallTime,
      callsToday
    });
  }, [currentView, user.id, nextCallTime, callsToday]);

  const handleGenerateCall = async () => {
    try {
      setIsGenerating(true);
      const result = await generateNextCall();

      if (result.success) {
        logger.logUserAction('call_generated', user.id, {
          nextCallTime: result.nextCallTime?.toISOString(),
          attempts: result.metadata?.attempts
        });
      }
    } catch (error) {
      logger.error('Failed to generate call', {
        userId: user.id,
        component: 'Dashboard',
        action: 'generateCall',
        metadata: { error }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCallNow = async (platform: Platform) => {
    if (!nextCallTime) return;

    try {
      // Mark call as attempted
      await markCallAttempted('called', platform);

      // Open the appropriate platform
      const phone = user.partner_phone?.replace(/\D/g, '');

      switch (platform) {
        case 'phone':
          window.open(`tel:${phone}`);
          break;
        case 'whatsapp':
          if (phone) {
            window.open(`https://wa.me/${phone}`);
          } else {
            window.open('whatsapp://');
          }
          break;
        case 'sms':
          window.open(`sms:${phone}?body=Hey ${user.partner_name}! 😊`);
          break;
      }

      logger.logUserAction('call_initiated', user.id, {
        platform,
        scheduledTime: nextCallTime.toISOString(),
        partnerName: user.partner_name
      });

      // Generate next call automatically
      setTimeout(() => {
        handleGenerateCall();
      }, 1000);
    } catch (error) {
      logger.error('Failed to initiate call', {
        userId: user.id,
        component: 'Dashboard',
        action: 'callNow',
        metadata: { error, platform }
      });
    }
  };

  const handleSkip = async () => {
    if (!nextCallTime) return;

    try {
      await markCallAttempted('skipped');
      logger.logUserAction('call_skipped', user.id);

      // Generate next call
      setTimeout(() => {
        handleGenerateCall();
      }, 500);
    } catch (error) {
      logger.error('Failed to skip call', {
        userId: user.id,
        component: 'Dashboard',
        action: 'skipCall',
        metadata: { error }
      });
    }
  };

  const handleLater = async (minutes: number) => {
    if (!nextCallTime) return;

    try {
      await rescheduleCall(minutes);
      logger.logUserAction('call_rescheduled', user.id, { delayMinutes: minutes });
    } catch (error) {
      logger.error('Failed to reschedule call', {
        userId: user.id,
        component: 'Dashboard',
        action: 'rescheduleCall',
        metadata: { error, minutes }
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const isTimeToCall = nextCallTime && new Date() >= new Date(nextCallTime.getTime() - 5 * 60000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Mobile-First Layout */}
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg relative">

        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">SpontaneousConnect</h1>
                <p className="text-blue-100 text-sm">{getGreeting()}, {user.name}! 👋</p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Today's Progress */}
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span>Today's calls</span>
              <span className="font-semibold">
                {callsToday} / {user.daily_call_limit}
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mt-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (callsToday / user.daily_call_limit) * 100)}%`
                }}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 pb-20">
          {/* Error Alert */}
          {schedulerError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{schedulerError}</p>
              <button
                onClick={clearSchedulerError}
                className="text-red-600 hover:text-red-800 text-xs mt-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Next Call Card */}
          <div className={`
            rounded-2xl p-6 mb-6 text-center transition-all duration-300
            ${isTimeToCall
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white animate-pulse'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
            }
          `}>
            {nextCallTime ? (
              <>
                <Clock className="w-8 h-8 mx-auto mb-3" />
                <p className="text-lg opacity-90 mb-1">
                  {isTimeToCall ? "Time to call!" : "Next call in"}
                </p>
                <p className="text-3xl font-bold mb-2">{timeUntilCall}</p>
                <p className="text-sm opacity-75">
                  Scheduled for {formatTime(nextCallTime)}
                </p>
                {isTimeToCall && (
                  <div className="mt-4">
                    <div className="text-lg font-medium mb-2">
                      📞 Call {user.partner_name} now!
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <Calendar className="w-8 h-8 mx-auto mb-3" />
                <p className="text-lg mb-2">No call scheduled</p>
                <p className="text-sm opacity-75 mb-4">
                  Ready to connect with {user.partner_name}?
                </p>
                <button
                  onClick={handleGenerateCall}
                  disabled={isGenerating}
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Schedule Call'}
                </button>
              </>
            )}
          </div>

          {/* Action Buttons */}
          {nextCallTime && (
            <div className="space-y-3 mb-6">
              {/* Primary Call Button */}
              <button
                onClick={() => handleCallNow('phone')}
                className={`
                  w-full font-medium py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105
                  ${isTimeToCall
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }
                `}
              >
                <Phone className="w-5 h-5" />
                <span>Call {user.partner_name} Now</span>
              </button>

              {/* Platform Options */}
              <div className="grid grid-cols-2 gap-3">
                {user.preferred_platforms.includes('whatsapp') && (
                  <button
                    onClick={() => handleCallNow('whatsapp')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                )}

                {user.preferred_platforms.includes('sms') && (
                  <button
                    onClick={() => handleCallNow('sms')}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Text</span>
                  </button>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleLater(15)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                >
                  Later (15m)
                </button>
                <button
                  onClick={() => handleLater(30)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                >
                  Later (30m)
                </button>
                <button
                  onClick={handleSkip}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>Skip</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-600">This Week</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">12</p>
              <p className="text-xs text-gray-500">Successful calls</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-600">Streak</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">7</p>
              <p className="text-xs text-gray-500">Days connected</p>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setCurrentView('schedule')}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <Calendar className="w-6 h-6 text-blue-500 mb-2" />
              <p className="font-medium text-gray-900 text-sm">Schedule</p>
              <p className="text-xs text-gray-500">Manage timing</p>
            </button>

            <button
              onClick={() => setCurrentView('history')}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <History className="w-6 h-6 text-green-500 mb-2" />
              <p className="font-medium text-gray-900 text-sm">History</p>
              <p className="text-xs text-gray-500">View past calls</p>
            </button>
          </div>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200">
          <div className="flex">
            <button
              onClick={() => setCurrentView('home')}
              className={`flex-1 p-4 text-center transition-colors ${
                currentView === 'home'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Heart className="w-5 h-5 mx-auto mb-1" />
              <div className="text-xs font-medium">Home</div>
            </button>

            <button
              onClick={() => setCurrentView('schedule')}
              className={`flex-1 p-4 text-center transition-colors ${
                currentView === 'schedule'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Calendar className="w-5 h-5 mx-auto mb-1" />
              <div className="text-xs font-medium">Schedule</div>
            </button>

            <button
              onClick={() => setCurrentView('history')}
              className={`flex-1 p-4 text-center transition-colors ${
                currentView === 'history'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <History className="w-5 h-5 mx-auto mb-1" />
              <div className="text-xs font-medium">History</div>
            </button>

            <button
              onClick={() => setCurrentView('settings')}
              className={`flex-1 p-4 text-center transition-colors ${
                currentView === 'settings'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Settings className="w-5 h-5 mx-auto mb-1" />
              <div className="text-xs font-medium">Settings</div>
            </button>
          </div>
        </nav>

        {/* Floating Action Button */}
        {!nextCallTime && currentView === 'home' && (
          <button
            onClick={handleGenerateCall}
            disabled={isGenerating}
            className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 disabled:opacity-50 flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
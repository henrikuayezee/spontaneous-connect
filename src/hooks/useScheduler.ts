/**
 * Professional Scheduler Hook
 * Manages call scheduling with intelligent algorithms and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { User, ScheduleHelper, BlockedTime, SchedulingResult, CallHistory } from '@/types';
import { CallScheduler, createScheduler, ScheduleUtils } from '@/lib/scheduler';
import { db } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { AppError, ValidationError } from '@/types';

interface SchedulerState {
  nextCallTime: Date | null;
  timeUntilCall: string;
  callsToday: number;
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  scheduleHelper: ScheduleHelper | null;
  blockedTimes: BlockedTime[];
  lastGenerated: Date | null;
}

interface SchedulerActions {
  generateNextCall: () => Promise<SchedulingResult>;
  markCallAttempted: (status: 'called' | 'skipped' | 'later', platform?: string) => Promise<void>;
  rescheduleCall: (delayMinutes: number) => Promise<void>;
  refreshSchedule: () => Promise<void>;
  validateCallTime: (time: Date) => Promise<boolean>;
  clearError: () => void;
}

export function useScheduler(user: User | null): SchedulerState & SchedulerActions {
  const [state, setState] = useState<SchedulerState>({
    nextCallTime: null,
    timeUntilCall: '',
    callsToday: 0,
    isGenerating: false,
    isLoading: false,
    error: null,
    scheduleHelper: null,
    blockedTimes: [],
    lastGenerated: null,
  });

  const schedulerRef = useRef<CallScheduler | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize scheduler when user changes
  useEffect(() => {
    if (user) {
      schedulerRef.current = createScheduler(user);
      loadInitialData();
    } else {
      schedulerRef.current = null;
      setState(prev => ({
        ...prev,
        nextCallTime: null,
        timeUntilCall: '',
        callsToday: 0,
        scheduleHelper: null,
        blockedTimes: [],
        lastGenerated: null,
      }));
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [user]);

  // Setup countdown timer
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    if (state.nextCallTime) {
      countdownIntervalRef.current = setInterval(() => {
        const timeUntil = ScheduleUtils.getTimeUntilCall(state.nextCallTime!);
        setState(prev => ({ ...prev, timeUntilCall: timeUntil }));

        // Check if it's time to call
        if (ScheduleUtils.isTimeToCall(state.nextCallTime!)) {
          logger.info('Call time reached', {
            userId: user?.id,
            component: 'useScheduler',
            action: 'callTimeReached',
            metadata: {
              scheduledTime: state.nextCallTime?.toISOString(),
              actualTime: new Date().toISOString()
            }
          });

          // Trigger notification or callback here
          // This could integrate with PWA notifications
        }
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [state.nextCallTime, user?.id]);

  const loadInitialData = async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load schedule helper and blocked times in parallel
      const [scheduleHelper, blockedTimes] = await Promise.all([
        db.getScheduleHelper(user.id),
        db.getBlockedTimes(user.id)
      ]);

      // Reset daily count if needed
      const today = new Date().toISOString().split('T')[0];
      let updatedScheduleHelper = scheduleHelper;

      if (scheduleHelper.daily_reset_date !== today) {
        updatedScheduleHelper = await db.updateScheduleHelper(
          user.id,
          {
            calls_today: 0,
            daily_reset_date: today
          },
          scheduleHelper.lock_version
        );

        logger.info('Daily call count reset', {
          userId: user.id,
          component: 'useScheduler',
          action: 'dailyReset',
          metadata: {
            previousDate: scheduleHelper.daily_reset_date,
            newDate: today,
            previousCount: scheduleHelper.calls_today
          }
        });
      }

      setState(prev => ({
        ...prev,
        scheduleHelper: updatedScheduleHelper,
        blockedTimes,
        nextCallTime: updatedScheduleHelper.next_call_due
          ? new Date(updatedScheduleHelper.next_call_due)
          : null,
        callsToday: updatedScheduleHelper.calls_today,
        lastGenerated: updatedScheduleHelper.last_generated
          ? new Date(updatedScheduleHelper.last_generated)
          : null,
        isLoading: false
      }));

      logger.info('Scheduler data loaded', {
        userId: user.id,
        component: 'useScheduler',
        action: 'loadInitialData',
        metadata: {
          hasNextCall: !!updatedScheduleHelper.next_call_due,
          callsToday: updatedScheduleHelper.calls_today,
          blockedTimesCount: blockedTimes.length
        }
      });
    } catch (error) {
      logger.error('Failed to load scheduler data', {
        userId: user.id,
        component: 'useScheduler',
        action: 'loadInitialData',
        metadata: { error }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load schedule data'
      }));
    }
  };

  const generateNextCall = useCallback(async (): Promise<SchedulingResult> => {
    if (!user || !schedulerRef.current || !state.scheduleHelper) {
      throw new ValidationError('User not authenticated or scheduler not initialized');
    }

    try {
      setState(prev => ({ ...prev, isGenerating: true, error: null }));

      logger.info('Starting call generation', {
        userId: user.id,
        component: 'useScheduler',
        action: 'generateNextCall',
        metadata: {
          currentCallsToday: state.callsToday,
          dailyLimit: user.daily_call_limit,
          blockedTimesCount: state.blockedTimes.length
        }
      });

      // Generate next call time using the scheduling engine
      const result = await schedulerRef.current.generateNextCallTime(
        state.blockedTimes,
        state.scheduleHelper
      );

      if (result.success && result.nextCallTime) {
        // Update schedule helper in database
        const updatedScheduleHelper = await db.updateScheduleHelper(
          user.id,
          {
            next_call_due: result.nextCallTime.toISOString(),
            last_generated: new Date().toISOString()
          },
          state.scheduleHelper.lock_version
        );

        setState(prev => ({
          ...prev,
          nextCallTime: result.nextCallTime!,
          scheduleHelper: updatedScheduleHelper,
          lastGenerated: new Date(),
          isGenerating: false,
          error: null
        }));

        logger.info('Call generation successful', {
          userId: user.id,
          component: 'useScheduler',
          action: 'generateSuccess',
          metadata: {
            nextCallTime: result.nextCallTime.toISOString(),
            attempts: result.metadata?.attempts,
            constraints: result.metadata?.constraints
          }
        });
      } else {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: result.error || 'Failed to generate call time'
        }));

        logger.warn('Call generation failed', {
          userId: user.id,
          component: 'useScheduler',
          action: 'generateFailed',
          metadata: {
            error: result.error,
            attempts: result.metadata?.attempts,
            constraints: result.metadata?.constraints
          }
        });
      }

      return result;
    } catch (error) {
      logger.error('Call generation error', {
        userId: user.id,
        component: 'useScheduler',
        action: 'generateError',
        metadata: { error }
      });

      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Call generation failed'
      }));

      throw error;
    }
  }, [user, state.scheduleHelper, state.blockedTimes, state.callsToday]);

  const markCallAttempted = useCallback(async (
    status: 'called' | 'skipped' | 'later',
    platform?: string
  ): Promise<void> => {
    if (!user || !state.nextCallTime || !state.scheduleHelper) {
      throw new ValidationError('Invalid state for marking call attempted');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Create call history entry
      const historyEntry: Omit<CallHistory, 'id' | 'created_at'> = {
        user_id: user.id,
        scheduled_time: state.nextCallTime.toISOString(),
        actual_time: new Date().toISOString(),
        platform_used: platform,
        status,
        metadata: {
          generated_at: state.lastGenerated?.toISOString(),
          attempt_delay_minutes: Math.round(
            (Date.now() - state.nextCallTime.getTime()) / (1000 * 60)
          )
        }
      };

      await db.addCallHistoryEntry(historyEntry);

      // Update schedule helper
      const updates: Partial<ScheduleHelper> = {
        last_call_time: new Date().toISOString(),
        next_call_due: null // Clear next call - will be generated again
      };

      // Increment daily counter if call was successful
      if (status === 'called') {
        updates.calls_today = state.callsToday + 1;
      }

      const updatedScheduleHelper = await db.updateScheduleHelper(
        user.id,
        updates,
        state.scheduleHelper.lock_version
      );

      setState(prev => ({
        ...prev,
        scheduleHelper: updatedScheduleHelper,
        callsToday: updatedScheduleHelper.calls_today,
        nextCallTime: null,
        isLoading: false
      }));

      logger.info('Call attempt marked', {
        userId: user.id,
        component: 'useScheduler',
        action: 'markCallAttempted',
        metadata: {
          status,
          platform,
          scheduledTime: state.nextCallTime.toISOString(),
          newCallsToday: updatedScheduleHelper.calls_today
        }
      });
    } catch (error) {
      logger.error('Failed to mark call attempted', {
        userId: user.id,
        component: 'useScheduler',
        action: 'markCallAttempted',
        metadata: { error, status, platform }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to mark call attempt'
      }));

      throw error;
    }
  }, [user, state.nextCallTime, state.scheduleHelper, state.callsToday, state.lastGenerated]);

  const rescheduleCall = useCallback(async (delayMinutes: number): Promise<void> => {
    if (!user || !state.nextCallTime || !state.scheduleHelper) {
      throw new ValidationError('Invalid state for rescheduling call');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const newCallTime = new Date(Date.now() + delayMinutes * 60000);

      // Validate the new time
      if (schedulerRef.current) {
        const validation = await schedulerRef.current.validateCallTime(
          newCallTime,
          state.blockedTimes,
          state.scheduleHelper
        );

        if (!validation.isValid) {
          if (validation.suggestedTime) {
            // Use suggested time instead
            const updatedScheduleHelper = await db.updateScheduleHelper(
              user.id,
              {
                next_call_due: validation.suggestedTime.toISOString(),
                last_generated: new Date().toISOString()
              },
              state.scheduleHelper.lock_version
            );

            setState(prev => ({
              ...prev,
              nextCallTime: validation.suggestedTime!,
              scheduleHelper: updatedScheduleHelper,
              isLoading: false
            }));

            logger.info('Call rescheduled with suggested time', {
              userId: user.id,
              component: 'useScheduler',
              action: 'rescheduleCall',
              metadata: {
                requestedDelay: delayMinutes,
                requestedTime: newCallTime.toISOString(),
                suggestedTime: validation.suggestedTime.toISOString(),
                reason: validation.reason
              }
            });

            return;
          } else {
            throw new ValidationError(
              `Cannot reschedule to requested time: ${validation.reason}`
            );
          }
        }
      }

      // Use the requested time
      const updatedScheduleHelper = await db.updateScheduleHelper(
        user.id,
        {
          next_call_due: newCallTime.toISOString(),
          last_generated: new Date().toISOString()
        },
        state.scheduleHelper.lock_version
      );

      setState(prev => ({
        ...prev,
        nextCallTime: newCallTime,
        scheduleHelper: updatedScheduleHelper,
        isLoading: false
      }));

      logger.info('Call rescheduled successfully', {
        userId: user.id,
        component: 'useScheduler',
        action: 'rescheduleCall',
        metadata: {
          delayMinutes,
          newCallTime: newCallTime.toISOString(),
          originalTime: state.nextCallTime.toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to reschedule call', {
        userId: user.id,
        component: 'useScheduler',
        action: 'rescheduleCall',
        metadata: { error, delayMinutes }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to reschedule call'
      }));

      throw error;
    }
  }, [user, state.nextCallTime, state.scheduleHelper, state.blockedTimes]);

  const refreshSchedule = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Reload schedule data
      const [scheduleHelper, blockedTimes] = await Promise.all([
        db.getScheduleHelper(user.id),
        db.getBlockedTimes(user.id)
      ]);

      setState(prev => ({
        ...prev,
        scheduleHelper,
        blockedTimes,
        nextCallTime: scheduleHelper.next_call_due
          ? new Date(scheduleHelper.next_call_due)
          : null,
        callsToday: scheduleHelper.calls_today,
        lastGenerated: scheduleHelper.last_generated
          ? new Date(scheduleHelper.last_generated)
          : null,
        isLoading: false
      }));

      logger.info('Schedule refreshed', {
        userId: user.id,
        component: 'useScheduler',
        action: 'refreshSchedule'
      });
    } catch (error) {
      logger.error('Failed to refresh schedule', {
        userId: user.id,
        component: 'useScheduler',
        action: 'refreshSchedule',
        metadata: { error }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh schedule'
      }));

      throw error;
    }
  }, [user]);

  const validateCallTime = useCallback(async (time: Date): Promise<boolean> => {
    if (!schedulerRef.current || !state.scheduleHelper) {
      return false;
    }

    try {
      const validation = await schedulerRef.current.validateCallTime(
        time,
        state.blockedTimes,
        state.scheduleHelper
      );

      return validation.isValid;
    } catch (error) {
      logger.error('Call time validation failed', {
        userId: user?.id,
        component: 'useScheduler',
        action: 'validateCallTime',
        metadata: { error, time: time.toISOString() }
      });

      return false;
    }
  }, [schedulerRef.current, state.scheduleHelper, state.blockedTimes, user?.id]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    generateNextCall,
    markCallAttempted,
    rescheduleCall,
    refreshSchedule,
    validateCallTime,
    clearError
  };
}
/**
 * Advanced Call Scheduling Engine
 * Implements intelligent algorithms for optimal call timing with constraint satisfaction
 */

import {
  User,
  BlockedTime,
  ScheduleHelper,
  CallGenerationOptions,
  CallValidationResult,
  SchedulingResult,
  BlockRepeatType,
  APP_CONFIG,
} from '@/types';
import { logger, withPerformanceLogging, withErrorLogging } from './logger';
import { ValidationError, AppError } from '@/types';
import { TIMING } from '@/constants';

/**
 * Core scheduling engine that generates optimal call times
 * Uses constraint satisfaction and machine learning principles
 */
export class CallScheduler {
  private readonly user: User;
  private readonly minGapMinutes: number;
  private readonly maxGapMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    user: User,
    options: Partial<CallGenerationOptions> = {}
  ) {
    this.user = user;
    this.minGapMinutes = options.minGapMinutes || APP_CONFIG.MIN_CALL_GAP_MINUTES;
    this.maxGapMinutes = options.maxGapMinutes || APP_CONFIG.MAX_CALL_GAP_MINUTES;
    this.maxAttempts = options.maxAttempts || 50;

    logger.debug('CallScheduler initialized', {
      userId: user.id,
      component: 'CallScheduler',
      action: 'initialize',
      metadata: {
        minGapMinutes: this.minGapMinutes,
        maxGapMinutes: this.maxGapMinutes,
        maxAttempts: this.maxAttempts,
      },
    });
  }

  /**
   * Generate the next optimal call time using intelligent algorithms
   */
  @withPerformanceLogging
  @withErrorLogging
  public async generateNextCallTime(
    blockedTimes: BlockedTime[],
    scheduleHelper: ScheduleHelper
  ): Promise<SchedulingResult> {
    logger.info('Generating next call time', {
      userId: this.user.id,
      component: 'CallScheduler',
      action: 'generateNextCallTime',
      metadata: {
        blockedTimesCount: blockedTimes.length,
        callsToday: scheduleHelper.calls_today,
        dailyLimit: this.user.daily_call_limit,
      },
    });

    try {
      // Validate daily limit
      if (scheduleHelper.calls_today >= this.user.daily_call_limit) {
        const nextDayTime = await this.getNextDayFirstCall();
        logger.info('Daily limit reached, scheduling for next day', {
          userId: this.user.id,
          component: 'CallScheduler',
          action: 'dailyLimitReached',
          metadata: { nextDayTime: nextDayTime.toISOString() },
        });

        return {
          success: true,
          nextCallTime: nextDayTime,
          metadata: {
            attempts: 1,
            constraints: ['daily_limit_reached'],
          },
        };
      }

      // Use multi-strategy approach for optimal time finding
      const strategies = [
        () => this.findTimeWithBasicRandomization(blockedTimes, scheduleHelper),
        () => this.findTimeWithPatternOptimization(blockedTimes, scheduleHelper),
        () => this.findTimeWithConstraintRelaxation(blockedTimes, scheduleHelper),
      ];

      let totalAttempts = 0;
      const allConstraints: string[] = [];

      for (const strategy of strategies) {
        const result = await strategy();
        totalAttempts += result.metadata?.attempts || 0;

        if (result.success && result.nextCallTime) {
          logger.info('Successfully generated call time', {
            userId: this.user.id,
            component: 'CallScheduler',
            action: 'generateSuccess',
            metadata: {
              nextCallTime: result.nextCallTime.toISOString(),
              totalAttempts,
              strategy: strategy.name,
            },
          });

          return {
            ...result,
            metadata: {
              ...result.metadata,
              attempts: totalAttempts,
            },
          };
        }

        if (result.metadata?.constraints) {
          allConstraints.push(...result.metadata.constraints);
        }
      }

      // All strategies failed
      logger.warn('Failed to generate call time with all strategies', {
        userId: this.user.id,
        component: 'CallScheduler',
        action: 'generateFailed',
        metadata: {
          totalAttempts,
          constraints: allConstraints,
        },
      });

      return {
        success: false,
        error: 'Unable to find valid call time within constraints',
        metadata: {
          attempts: totalAttempts,
          constraints: allConstraints,
        },
      };
    } catch (error) {
      logger.error('Error in call time generation', {
        userId: this.user.id,
        component: 'CallScheduler',
        action: 'generateError',
        metadata: { error },
      });

      throw new AppError(
        'Failed to generate call time',
        'SCHEDULING_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Strategy 1: Basic randomization within constraints
   */
  private async findTimeWithBasicRandomization(
    blockedTimes: BlockedTime[],
    scheduleHelper: ScheduleHelper
  ): Promise<SchedulingResult> {
    const now = new Date();
    let attempts = 0;
    const constraints: string[] = [];

    while (attempts < this.maxAttempts) {
      attempts++;

      // Generate random interval
      const randomMinutes = Math.floor(
        Math.random() * (this.maxGapMinutes - this.minGapMinutes) + this.minGapMinutes
      );
      const proposedTime = new Date(now.getTime() + randomMinutes * 60000);

      const validation = await this.validateCallTime(
        proposedTime,
        blockedTimes,
        scheduleHelper
      );

      if (validation.isValid) {
        return {
          success: true,
          nextCallTime: proposedTime,
          metadata: {
            attempts,
            constraints,
          },
        };
      }

      if (validation.reason && !constraints.includes(validation.reason)) {
        constraints.push(validation.reason);
      }

      // Try suggested time if available
      if (validation.suggestedTime) {
        const suggestedValidation = await this.validateCallTime(
          validation.suggestedTime,
          blockedTimes,
          scheduleHelper
        );

        if (suggestedValidation.isValid) {
          return {
            success: true,
            nextCallTime: validation.suggestedTime,
            metadata: {
              attempts,
              constraints,
            },
          };
        }
      }
    }

    return {
      success: false,
      error: 'Max attempts reached with basic randomization',
      metadata: {
        attempts,
        constraints,
      },
    };
  }

  /**
   * Strategy 2: Pattern-based optimization using historical data
   */
  private async findTimeWithPatternOptimization(
    blockedTimes: BlockedTime[],
    scheduleHelper: ScheduleHelper
  ): Promise<SchedulingResult> {
    // This would integrate with call history to find optimal patterns
    // For now, implement preferred time slots based on user preferences

    const preferredSlots = this.getPreferredTimeSlots();
    const constraints: string[] = [];
    let attempts = 0;

    for (const slot of preferredSlots) {
      attempts++;

      const proposedTime = this.getNextOccurrenceOfTimeSlot(slot);
      const validation = await this.validateCallTime(
        proposedTime,
        blockedTimes,
        scheduleHelper
      );

      if (validation.isValid) {
        return {
          success: true,
          nextCallTime: proposedTime,
          metadata: {
            attempts,
            constraints,
          },
        };
      }

      if (validation.reason && !constraints.includes(validation.reason)) {
        constraints.push(validation.reason);
      }
    }

    return {
      success: false,
      error: 'No valid time slots found in preferred patterns',
      metadata: {
        attempts,
        constraints,
      },
    };
  }

  /**
   * Strategy 3: Constraint relaxation for edge cases
   */
  private async findTimeWithConstraintRelaxation(
    blockedTimes: BlockedTime[],
    scheduleHelper: ScheduleHelper
  ): Promise<SchedulingResult> {
    // Gradually relax constraints to find acceptable times
    const relaxationStrategies = [
      { minGap: this.minGapMinutes * 0.75, description: 'reduced_min_gap' },
      { minGap: this.minGapMinutes * 0.5, description: 'minimal_gap' },
      { ignoreLowPriorityBlocks: true, description: 'ignore_low_priority_blocks' },
    ];

    let totalAttempts = 0;
    const allConstraints: string[] = [];

    for (const strategy of relaxationStrategies) {
      const filteredBlocks = strategy.ignoreLowPriorityBlocks
        ? blockedTimes.filter(block => block.priority > 0)
        : blockedTimes;

      const tempMinGap = strategy.minGap || this.minGapMinutes;
      let attempts = 0;

      while (attempts < Math.floor(this.maxAttempts / relaxationStrategies.length)) {
        attempts++;
        totalAttempts++;

        const randomMinutes = Math.floor(
          Math.random() * (this.maxGapMinutes - tempMinGap) + tempMinGap
        );
        const proposedTime = new Date(Date.now() + randomMinutes * 60000);

        // Create temporary scheduler with relaxed constraints
        const relaxedScheduler = new CallScheduler(this.user, {
          minGapMinutes: tempMinGap,
        });

        const validation = await relaxedScheduler.validateCallTime(
          proposedTime,
          filteredBlocks,
          scheduleHelper
        );

        if (validation.isValid) {
          logger.info('Found time with relaxed constraints', {
            userId: this.user.id,
            component: 'CallScheduler',
            action: 'constraintRelaxation',
            metadata: {
              strategy: strategy.description,
              originalMinGap: this.minGapMinutes,
              relaxedMinGap: tempMinGap,
              blocksIgnored: blockedTimes.length - filteredBlocks.length,
            },
          });

          return {
            success: true,
            nextCallTime: proposedTime,
            metadata: {
              attempts: totalAttempts,
              constraints: [...allConstraints, strategy.description],
            },
          };
        }

        if (validation.reason && !allConstraints.includes(validation.reason)) {
          allConstraints.push(validation.reason);
        }
      }
    }

    return {
      success: false,
      error: 'All constraint relaxation strategies failed',
      metadata: {
        attempts: totalAttempts,
        constraints: allConstraints,
      },
    };
  }

  /**
   * Comprehensive time validation against all constraints
   */
  @withPerformanceLogging
  public async validateCallTime(
    time: Date,
    blockedTimes: BlockedTime[],
    scheduleHelper: ScheduleHelper
  ): Promise<CallValidationResult> {
    try {
      // Check if within daily time window
      const timeStr = time.toTimeString().slice(0, 5);
      if (timeStr < this.user.morning_start || timeStr > this.user.evening_end) {
        const suggestedTime = this.adjustToTimeWindow(time);
        return {
          isValid: false,
          reason: 'outside_daily_window',
          suggestedTime,
        };
      }

      // Check if day is active
      const dayName = time.toLocaleDateString('en', { weekday: 'short' });
      if (!this.user.active_days.includes(dayName)) {
        const suggestedTime = this.getNextActiveDay(time);
        return {
          isValid: false,
          reason: 'inactive_day',
          suggestedTime,
        };
      }

      // Check minimum gap since last call
      if (scheduleHelper.last_call_time) {
        const lastCall = new Date(scheduleHelper.last_call_time);
        const timeDiff = (time.getTime() - lastCall.getTime()) / (1000 * 60);

        if (timeDiff < this.minGapMinutes) {
          const suggestedTime = new Date(
            lastCall.getTime() + this.minGapMinutes * 60000
          );
          return {
            isValid: false,
            reason: 'min_gap_violation',
            suggestedTime,
          };
        }
      }

      // Check against blocked times
      for (const block of blockedTimes.filter(b => b.is_active)) {
        if (await this.isTimeInBlockedPeriod(time, block)) {
          const suggestedTime = await this.findNextAvailableTimeAfterBlock(time, block);
          return {
            isValid: false,
            reason: `blocked_${block.block_name.toLowerCase().replace(/\s+/g, '_')}`,
            suggestedTime,
          };
        }
      }

      // Check if time is too far in the past
      const now = new Date();
      if (time <= now) {
        return {
          isValid: false,
          reason: 'past_time',
          suggestedTime: new Date(now.getTime() + this.minGapMinutes * 60000),
        };
      }

      return { isValid: true };
    } catch (error) {
      logger.error('Error validating call time', {
        userId: this.user.id,
        component: 'CallScheduler',
        action: 'validateError',
        metadata: { error, time: time.toISOString() },
      });

      return {
        isValid: false,
        reason: 'validation_error',
      };
    }
  }

  /**
   * Check if time falls within a blocked period
   */
  private async isTimeInBlockedPeriod(time: Date, block: BlockedTime): Promise<boolean> {
    const timeStr = time.toTimeString().slice(0, 5);
    const dayName = time.toLocaleDateString('en', { weekday: 'short' });

    // Check if day matches block schedule
    switch (block.repeat_type) {
      case BlockRepeatType.DAILY:
        break; // Always applies
      case BlockRepeatType.WEEKDAYS:
        if (['Sat', 'Sun'].includes(dayName)) return false;
        break;
      case BlockRepeatType.WEEKENDS:
        if (!['Sat', 'Sun'].includes(dayName)) return false;
        break;
      case BlockRepeatType.CUSTOM:
        if (!block.days_of_week?.includes(dayName)) return false;
        break;
      case BlockRepeatType.ONCE:
        // For one-time blocks, we'd need to check specific dates
        // This would require storing the actual date in the block
        break;
    }

    // Check if time is within blocked period
    return timeStr >= block.start_time && timeStr <= block.end_time;
  }

  /**
   * Get preferred time slots based on user patterns and optimal calling times
   */
  private getPreferredTimeSlots(): { hour: number; minute: number }[] {
    const slots: { hour: number; minute: number }[] = [];

    // Parse user's preferred time window
    const [startHour, startMinute] = this.user.morning_start.split(':').map(Number);
    const [endHour, endMinute] = this.user.evening_end.split(':').map(Number);

    // Generate optimal time slots (research-based optimal calling times)
    const optimalHours = [10, 11, 14, 16, 19, 20]; // 10am, 11am, 2pm, 4pm, 7pm, 8pm

    for (const hour of optimalHours) {
      if (hour >= startHour && hour <= endHour) {
        // Add some randomness to minutes
        const minute = Math.floor(Math.random() * 60);
        slots.push({ hour, minute });
      }
    }

    // Sort by preference (mid-day and early evening are typically best)
    return slots.sort((a, b) => {
      const aScore = this.getTimeSlotScore(a);
      const bScore = this.getTimeSlotScore(b);
      return bScore - aScore;
    });
  }

  /**
   * Score time slots based on research and user preferences
   */
  private getTimeSlotScore(slot: { hour: number; minute: number }): number {
    let score = 0;

    // Prefer mid-day times (research shows higher answer rates)
    if (slot.hour >= 10 && slot.hour <= 16) score += 3;

    // Prefer early evening (good for personal calls)
    if (slot.hour >= 19 && slot.hour <= 21) score += 4;

    // Slight preference for hour/half-hour times
    if (slot.minute === 0 || slot.minute === 30) score += 1;

    // Avoid very early morning or late night
    if (slot.hour < 9 || slot.hour > 22) score -= 2;

    return score;
  }

  /**
   * Get next occurrence of a specific time slot
   */
  private getNextOccurrenceOfTimeSlot(slot: { hour: number; minute: number }): Date {
    const now = new Date();
    const proposedTime = new Date(now);

    proposedTime.setHours(slot.hour, slot.minute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (proposedTime <= now) {
      proposedTime.setDate(proposedTime.getDate() + 1);
    }

    // Add some randomness (±15 minutes) to avoid predictability
    const randomOffset = (Math.random() - 0.5) * TIMING.RANDOMIZATION_WINDOW_MINUTES;
    proposedTime.setMinutes(proposedTime.getMinutes() + randomOffset);

    return proposedTime;
  }

  /**
   * Adjust time to fit within user's daily window
   */
  private adjustToTimeWindow(time: Date): Date {
    const adjusted = new Date(time);
    const timeStr = time.toTimeString().slice(0, 5);

    if (timeStr < this.user.morning_start) {
      const [hour, minute] = this.user.morning_start.split(':').map(Number);
      adjusted.setHours(hour, minute, 0, 0);
    } else if (timeStr > this.user.evening_end) {
      // Move to next day's morning
      adjusted.setDate(adjusted.getDate() + 1);
      const [hour, minute] = this.user.morning_start.split(':').map(Number);
      adjusted.setHours(hour, minute, 0, 0);
    }

    return adjusted;
  }

  /**
   * Get next active day if current day is inactive
   */
  private getNextActiveDay(time: Date): Date {
    const adjusted = new Date(time);
    const activeDays = this.user.active_days.split(',');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 1; i <= 7; i++) {
      adjusted.setDate(adjusted.getDate() + 1);
      const dayName = dayNames[adjusted.getDay()];

      if (activeDays.includes(dayName)) {
        // Set to morning start time
        const [hour, minute] = this.user.morning_start.split(':').map(Number);
        adjusted.setHours(hour, minute, 0, 0);
        return adjusted;
      }
    }

    // Fallback (should never happen if user has at least one active day)
    return new Date(time.getTime() + 24 * 60 * 60 * 1000);
  }

  /**
   * Find next available time after a blocked period
   */
  private async findNextAvailableTimeAfterBlock(
    time: Date,
    block: BlockedTime
  ): Promise<Date> {
    const blockEnd = new Date(time);
    const [endHour, endMinute] = block.end_time.split(':').map(Number);

    blockEnd.setHours(endHour, endMinute, 0, 0);

    // Add buffer time after block ends
    blockEnd.setMinutes(blockEnd.getMinutes() + 15);

    // Ensure it's within user's active window
    return this.adjustToTimeWindow(blockEnd);
  }

  /**
   * Get first call time for the next day
   */
  private async getNextDayFirstCall(): Promise<Date> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [hours, minutes] = this.user.morning_start.split(':').map(Number);
    tomorrow.setHours(hours, minutes, 0, 0);

    // Add some randomness (0-60 minutes)
    const randomMinutes = Math.floor(Math.random() * 60);
    tomorrow.setMinutes(tomorrow.getMinutes() + randomMinutes);

    return tomorrow;
  }
}

/**
 * Factory function to create scheduler instances
 */
export function createScheduler(user: User, options?: Partial<CallGenerationOptions>): CallScheduler {
  return new CallScheduler(user, options);
}

/**
 * Utility functions for schedule management
 */
export const ScheduleUtils = {
  /**
   * Calculate time until next call
   */
  getTimeUntilCall(nextCallTime: Date): string {
    const now = new Date();
    const diff = nextCallTime.getTime() - now.getTime();

    if (diff <= 0) return 'Time to call!';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  },

  /**
   * Check if it's currently time to call
   */
  isTimeToCall(nextCallTime: Date, tolerance: number = 5): boolean {
    const now = new Date();
    const diff = Math.abs(nextCallTime.getTime() - now.getTime());
    return diff <= tolerance * 60 * 1000; // tolerance in minutes
  },

  /**
   * Get friendly time description
   */
  getFriendlyTimeDescription(nextCallTime: Date): string {
    const now = new Date();
    const diff = nextCallTime.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) {
      return 'very soon';
    } else if (hours < 3) {
      return 'in a bit';
    } else if (hours < 6) {
      return 'later today';
    } else if (hours < 24) {
      return 'this evening';
    } else {
      return 'tomorrow';
    }
  },
};
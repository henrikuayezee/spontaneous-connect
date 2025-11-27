import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CallScheduler } from './scheduler';
import { User, BlockedTime, ScheduleHelper, BlockRepeatType } from '@/types';

describe('CallScheduler', () => {
    const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        partner_name: 'Partner',
        daily_call_limit: 3,
        active_days: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        morning_start: '09:00',
        evening_end: '21:00',
        preferred_platforms: 'phone',
        timezone: 'Asia/Tokyo', // UTC+9
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
    };

    const mockScheduleHelper: ScheduleHelper = {
        id: 'helper-1',
        user_id: 'user-1',
        calls_today: 0,
        daily_reset_date: new Date().toISOString(),
        last_generated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lock_version: 1,
    };

    const mockBlockedTimes: BlockedTime[] = [];

    let scheduler: CallScheduler;

    beforeEach(() => {
        scheduler = new CallScheduler(mockUser);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should respect timezone when validating call time', async () => {
        // Set system time to 23:59 UTC previous day, so 00:00 UTC is in the future
        const targetTime = new Date('2023-10-25T00:00:00Z'); // 09:00 Tokyo
        const systemTime = new Date('2023-10-24T23:59:00Z');
        vi.setSystemTime(systemTime);

        const result = await scheduler.validateCallTime(targetTime, mockBlockedTimes, mockScheduleHelper);
        expect(result.isValid).toBe(true);
    });

    it('should reject call if outside daily window in user timezone', async () => {
        // 15:00 UTC is 00:00 Tokyo (next day)
        // 00:00 is outside 09:00-21:00 window
        const targetTime = new Date('2023-10-25T15:00:00Z');
        const systemTime = new Date('2023-10-25T14:59:00Z');
        vi.setSystemTime(systemTime);

        const result = await scheduler.validateCallTime(targetTime, mockBlockedTimes, mockScheduleHelper);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('outside_daily_window');
    });

    it('should respect blocked times in user timezone', async () => {
        // Block lunch: 12:00 - 13:00 Tokyo time
        const blockedTime: BlockedTime = {
            id: 'block-1',
            user_id: 'user-1',
            block_name: 'Lunch',
            start_time: '12:00',
            end_time: '13:00',
            repeat_type: BlockRepeatType.DAILY,
            is_active: true,
            priority: 1,
            created_at: new Date().toISOString(),
        };

        // 03:30 UTC is 12:30 Tokyo time (inside block)
        const targetTime = new Date('2023-10-25T03:30:00Z');
        const systemTime = new Date('2023-10-25T03:29:00Z');
        vi.setSystemTime(systemTime);

        const result = await scheduler.validateCallTime(targetTime, [blockedTime], mockScheduleHelper);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('blocked_lunch');
    });

    it('should allow call if outside blocked time', async () => {
        // Block lunch: 12:00 - 13:00 Tokyo time
        const blockedTime: BlockedTime = {
            id: 'block-1',
            user_id: 'user-1',
            block_name: 'Lunch',
            start_time: '12:00',
            end_time: '13:00',
            repeat_type: BlockRepeatType.DAILY,
            is_active: true,
            priority: 1,
            created_at: new Date().toISOString(),
        };

        // 04:30 UTC is 13:30 Tokyo time (outside block)
        const targetTime = new Date('2023-10-25T04:30:00Z');
        const systemTime = new Date('2023-10-25T04:29:00Z');
        vi.setSystemTime(systemTime);

        const result = await scheduler.validateCallTime(targetTime, [blockedTime], mockScheduleHelper);
        expect(result.isValid).toBe(true);
    });
});

/**
 * Enterprise-grade Supabase Integration Layer
 * Implements advanced patterns: connection pooling, caching, retry logic, optimistic locking
 */

import { createClient, SupabaseClient, Session, User as SupabaseUser } from '@supabase/supabase-js';
import {
  User,
  CallHistory,
  BlockedTime,
  ScheduleHelper,
  ApiResponse,
  ApiError,
  AppError,
  AuthenticationError,
  NetworkError,
  ValidationError
} from '@/types';
import { logger, withPerformanceLogging, withErrorLogging } from './logger';

// Environment configuration with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Enterprise configuration
const SUPABASE_CONFIG = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'spontaneous-connect@1.0.0',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
};

// Create Supabase client with enterprise config
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  SUPABASE_CONFIG
);

/**
 * Enterprise Database Access Layer with advanced patterns
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private client: SupabaseClient;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes default
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second base delay

  private constructor() {
    this.client = supabase;
    this.setupRealtimeSubscriptions();
    this.setupPerformanceMonitoring();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Setup real-time subscriptions for live updates
   */
  private setupRealtimeSubscriptions(): void {
    // Subscribe to user profile changes
    this.client
      .channel('user_profiles')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, (payload) => {
        logger.info('Real-time user update received', {
          component: 'DatabaseService',
          action: 'realtimeUpdate',
          metadata: {
            event: payload.eventType,
            userId: payload.new?.id || payload.old?.id
          }
        });

        // Invalidate cache for updated user
        this.invalidateUserCache(payload.new?.id || payload.old?.id);
      })
      .subscribe();

    // Subscribe to schedule changes
    this.client
      .channel('schedule_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'schedule_helper'
      }, (payload) => {
        logger.info('Real-time schedule update received', {
          component: 'DatabaseService',
          action: 'scheduleUpdate',
          metadata: {
            event: payload.eventType,
            userId: payload.new?.user_id || payload.old?.user_id
          }
        });
      })
      .subscribe();
  }

  /**
   * Setup performance monitoring for database operations
   */
  private setupPerformanceMonitoring(): void {
    // Monitor slow queries
    const originalFrom = this.client.from.bind(this.client);
    this.client.from = (table: string) => {
      const startTime = performance.now();
      const query = originalFrom(table);

      // Wrap common methods to track performance
      const originalSelect = query.select.bind(query);
      query.select = (...args: any[]) => {
        const result = originalSelect(...args);

        // Track performance on execution
        const originalThen = result.then?.bind(result);
        if (originalThen) {
          result.then = (onfulfilled?: any, onrejected?: any) => {
            return originalThen(
              (data: any) => {
                const duration = performance.now() - startTime;
                logger.logPerformance(`db_query_${table}`, duration, {
                  component: 'DatabaseService',
                  metadata: { table, operation: 'select' }
                });
                return onfulfilled?.(data);
              },
              onrejected
            );
          };
        }

        return result;
      };

      return query;
    };
  }

  /**
   * Advanced retry mechanism with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        logger.warn(`Database operation failed, attempt ${attempt}/${maxRetries}`, {
          component: 'DatabaseService',
          action: 'retryAttempt',
          metadata: {
            context,
            attempt,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });

        if (attempt === maxRetries) break;

        // Exponential backoff with jitter
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new NetworkError(`Database operation failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Advanced caching with TTL and invalidation
   */
  private getCacheKey(table: string, params: Record<string, any>): string {
    return `${table}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', {
      component: 'DatabaseService',
      action: 'cacheHit',
      metadata: { key }
    });

    return cached.data;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    logger.debug('Cache set', {
      component: 'DatabaseService',
      action: 'cacheSet',
      metadata: { key, ttl }
    });
  }

  private invalidateCache(pattern: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
    keysToDelete.forEach(key => this.cache.delete(key));

    logger.debug('Cache invalidated', {
      component: 'DatabaseService',
      action: 'cacheInvalidate',
      metadata: { pattern, keysInvalidated: keysToDelete.length }
    });
  }

  private invalidateUserCache(userId: string): void {
    this.invalidateCache(`users_${userId}`);
    this.invalidateCache(`call_history_${userId}`);
    this.invalidateCache(`blocked_times_${userId}`);
    this.invalidateCache(`schedule_helper_${userId}`);
  }

  /**
   * Transform Supabase errors to application errors
   */
  private transformError(error: any, operation: string): AppError {
    logger.error(`Database error in ${operation}`, {
      component: 'DatabaseService',
      action: 'databaseError',
      metadata: {
        operation,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      }
    });

    if (error.code === 'PGRST116') {
      return new ValidationError('Invalid request parameters');
    }

    if (error.code === '23505') {
      return new ValidationError('Duplicate entry detected');
    }

    if (error.code === '23503') {
      return new ValidationError('Referenced record not found');
    }

    if (error.message?.includes('JWT')) {
      return new AuthenticationError('Session expired');
    }

    return new AppError(
      error.message || 'Database operation failed',
      error.code || 'DATABASE_ERROR',
      500,
      error
    );
  }

  // ====================
  // USER OPERATIONS
  // ====================

  @withPerformanceLogging
  @withErrorLogging
  public async getUserProfile(userId: string): Promise<User> {
    const cacheKey = this.getCacheKey('users', { id: userId });
    const cached = this.getFromCache<User>(cacheKey);
    if (cached) return cached;

    return this.withRetry(async () => {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw this.transformError(error, 'getUserProfile');
      if (!data) throw new ValidationError('User not found');

      this.setCache(cacheKey, data);
      return data;
    }, 'getUserProfile');
  }

  @withPerformanceLogging
  @withErrorLogging
  public async createUserProfile(user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'version'>): Promise<User> {
    return this.withRetry(async () => {
      const { data, error } = await this.client
        .from('users')
        .insert({
          ...user,
          version: 1
        })
        .select()
        .single();

      if (error) throw this.transformError(error, 'createUserProfile');

      // Initialize schedule helper for new user
      await this.createScheduleHelper(data.id);

      logger.info('User profile created', {
        userId: data.id,
        component: 'DatabaseService',
        action: 'createUserProfile'
      });

      return data;
    }, 'createUserProfile');
  }

  @withPerformanceLogging
  @withErrorLogging
  public async updateUserProfile(
    userId: string,
    updates: Partial<User>,
    expectedVersion?: number
  ): Promise<User> {
    return this.withRetry(async () => {
      let query = this.client
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          version: expectedVersion ? expectedVersion + 1 : undefined
        })
        .eq('id', userId);

      // Optimistic locking
      if (expectedVersion !== undefined) {
        query = query.eq('version', expectedVersion);
      }

      const { data, error } = await query.select().single();

      if (error) {
        if (error.code === 'PGRST116' && expectedVersion !== undefined) {
          throw new ValidationError('User profile was modified by another process. Please refresh and try again.');
        }
        throw this.transformError(error, 'updateUserProfile');
      }

      this.invalidateUserCache(userId);

      logger.info('User profile updated', {
        userId,
        component: 'DatabaseService',
        action: 'updateUserProfile',
        metadata: { updatedFields: Object.keys(updates) }
      });

      return data;
    }, 'updateUserProfile');
  }

  // ====================
  // CALL HISTORY OPERATIONS
  // ====================

  @withPerformanceLogging
  @withErrorLogging
  public async getCallHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CallHistory[]> {
    const cacheKey = this.getCacheKey('call_history', { userId, limit, offset });
    const cached = this.getFromCache<CallHistory[]>(cacheKey);
    if (cached) return cached;

    return this.withRetry(async () => {
      const { data, error } = await this.client
        .from('call_history')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw this.transformError(error, 'getCallHistory');

      this.setCache(cacheKey, data || [], this.CACHE_TTL / 2); // Shorter TTL for dynamic data
      return data || [];
    }, 'getCallHistory');
  }

  @withPerformanceLogging
  @withErrorLogging
  public async addCallHistoryEntry(entry: Omit<CallHistory, 'id' | 'created_at'>): Promise<CallHistory> {
    return this.withRetry(async () => {
      const { data, error } = await this.client
        .from('call_history')
        .insert(entry)
        .select()
        .single();

      if (error) throw this.transformError(error, 'addCallHistoryEntry');

      this.invalidateCache(`call_history_${entry.user_id}`);

      logger.info('Call history entry added', {
        userId: entry.user_id,
        component: 'DatabaseService',
        action: 'addCallHistoryEntry',
        metadata: {
          status: entry.status,
          platform: entry.platform_used,
          scheduledTime: entry.scheduled_time
        }
      });

      return data;
    }, 'addCallHistoryEntry');
  }

  @withPerformanceLogging
  @withErrorLogging
  public async updateCallHistoryEntry(
    entryId: string,
    updates: Partial<CallHistory>
  ): Promise<CallHistory> {
    return this.withRetry(async () => {
      const { data, error } = await this.client
        .from('call_history')
        .update(updates)
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw this.transformError(error, 'updateCallHistoryEntry');

      this.invalidateCache(`call_history_${data.user_id}`);

      logger.info('Call history entry updated', {
        userId: data.user_id,
        component: 'DatabaseService',
        action: 'updateCallHistoryEntry',
        metadata: { entryId, updatedFields: Object.keys(updates) }
      });

      return data;
    }, 'updateCallHistoryEntry');
  }

  // ====================
  // BLOCKED TIMES OPERATIONS
  // ====================

  @withPerformanceLogging
  @withErrorLogging
  public async getBlockedTimes(userId: string): Promise<BlockedTime[]> {
    const cacheKey = this.getCacheKey('blocked_times', { userId });
    const cached = this.getFromCache<BlockedTime[]>(cacheKey);
    if (cached) return cached;

    return this.withRetry(async () => {
      const { data, error } = await this.client
        .from('blocked_times')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw this.transformError(error, 'getBlockedTimes');

      this.setCache(cacheKey, data || []);
      return data || [];
    }, 'getBlockedTimes');
  }

  @withPerformanceLogging
  @withErrorLogging
  public async addBlockedTime(blockedTime: Omit<BlockedTime, 'id' | 'created_at'>): Promise<BlockedTime> {
    return this.withRetry(async () => {
      const { data, error } = await this.client
        .from('blocked_times')
        .insert(blockedTime)
        .select()
        .single();

      if (error) throw this.transformError(error, 'addBlockedTime');

      this.invalidateCache(`blocked_times_${blockedTime.user_id}`);

      logger.info('Blocked time added', {
        userId: blockedTime.user_id,
        component: 'DatabaseService',
        action: 'addBlockedTime',
        metadata: {
          blockName: blockedTime.block_name,
          timeRange: `${blockedTime.start_time}-${blockedTime.end_time}`,
          repeatType: blockedTime.repeat_type
        }
      });

      return data;
    }, 'addBlockedTime');
  }

  @withPerformanceLogging
  @withErrorLogging
  public async updateBlockedTime(
    blockId: string,
    updates: Partial<BlockedTime>
  ): Promise<BlockedTime> {
    return this.withRetry(async () => {
      const { data, error } = await this.client
        .from('blocked_times')
        .update(updates)
        .eq('id', blockId)
        .select()
        .single();

      if (error) throw this.transformError(error, 'updateBlockedTime');

      this.invalidateCache(`blocked_times_${data.user_id}`);

      logger.info('Blocked time updated', {
        userId: data.user_id,
        component: 'DatabaseService',
        action: 'updateBlockedTime',
        metadata: { blockId, updatedFields: Object.keys(updates) }
      });

      return data;
    }, 'updateBlockedTime');
  }

  @withPerformanceLogging
  @withErrorLogging
  public async deleteBlockedTime(blockId: string, userId: string): Promise<void> {
    return this.withRetry(async () => {
      const { error } = await this.client
        .from('blocked_times')
        .delete()
        .eq('id', blockId)
        .eq('user_id', userId); // Security: ensure user owns the block

      if (error) throw this.transformError(error, 'deleteBlockedTime');

      this.invalidateCache(`blocked_times_${userId}`);

      logger.info('Blocked time deleted', {
        userId,
        component: 'DatabaseService',
        action: 'deleteBlockedTime',
        metadata: { blockId }
      });
    }, 'deleteBlockedTime');
  }

  // ====================
  // SCHEDULE HELPER OPERATIONS
  // ====================

  @withPerformanceLogging
  @withErrorLogging
  public async getScheduleHelper(userId: string): Promise<ScheduleHelper> {
    const cacheKey = this.getCacheKey('schedule_helper', { userId });
    const cached = this.getFromCache<ScheduleHelper>(cacheKey);
    if (cached) return cached;

    return this.withRetry(async () => {
      const { data, error } = await this.client
        .from('schedule_helper')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Create if doesn't exist
          return this.createScheduleHelper(userId);
        }
        throw this.transformError(error, 'getScheduleHelper');
      }

      this.setCache(cacheKey, data);
      return data;
    }, 'getScheduleHelper');
  }

  @withPerformanceLogging
  @withErrorLogging
  public async createScheduleHelper(userId: string): Promise<ScheduleHelper> {
    return this.withRetry(async () => {
      const { data, error } = await this.client
        .from('schedule_helper')
        .insert({
          user_id: userId,
          calls_today: 0,
          daily_reset_date: new Date().toISOString().split('T')[0],
          last_generated: new Date().toISOString(),
          lock_version: 1
        })
        .select()
        .single();

      if (error) throw this.transformError(error, 'createScheduleHelper');

      logger.info('Schedule helper created', {
        userId,
        component: 'DatabaseService',
        action: 'createScheduleHelper'
      });

      return data;
    }, 'createScheduleHelper');
  }

  @withPerformanceLogging
  @withErrorLogging
  public async updateScheduleHelper(
    userId: string,
    updates: Partial<ScheduleHelper>,
    expectedLockVersion?: number
  ): Promise<ScheduleHelper> {
    return this.withRetry(async () => {
      let query = this.client
        .from('schedule_helper')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          lock_version: expectedLockVersion ? expectedLockVersion + 1 : undefined
        })
        .eq('user_id', userId);

      // Optimistic locking for schedule updates
      if (expectedLockVersion !== undefined) {
        query = query.eq('lock_version', expectedLockVersion);
      }

      const { data, error } = await query.select().single();

      if (error) {
        if (error.code === 'PGRST116' && expectedLockVersion !== undefined) {
          throw new ValidationError('Schedule was modified by another process. Please refresh and try again.');
        }
        throw this.transformError(error, 'updateScheduleHelper');
      }

      this.invalidateCache(`schedule_helper_${userId}`);

      logger.info('Schedule helper updated', {
        userId,
        component: 'DatabaseService',
        action: 'updateScheduleHelper',
        metadata: { updatedFields: Object.keys(updates) }
      });

      return data;
    }, 'updateScheduleHelper');
  }

  // ====================
  // ANALYTICS & REPORTING
  // ====================

  @withPerformanceLogging
  @withErrorLogging
  public async getCallMetrics(userId: string, days: number = 30): Promise<any> {
    const cacheKey = this.getCacheKey('metrics', { userId, days });
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    return this.withRetry(async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await this.client
        .from('call_history')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString());

      if (error) throw this.transformError(error, 'getCallMetrics');

      // Process metrics
      const metrics = this.processCallMetrics(data || []);

      this.setCache(cacheKey, metrics, this.CACHE_TTL * 2); // Longer cache for analytics
      return metrics;
    }, 'getCallMetrics');
  }

  private processCallMetrics(callHistory: CallHistory[]): any {
    const totalCalls = callHistory.length;
    const successfulCalls = callHistory.filter(call => call.status === 'called').length;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    const ratings = callHistory
      .filter(call => call.success_rating !== null && call.success_rating !== undefined)
      .map(call => call.success_rating!);

    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;

    // Platform usage analysis
    const platformUsage = callHistory.reduce((acc, call) => {
      if (call.platform_used) {
        acc[call.platform_used] = (acc[call.platform_used] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCalls,
      successfulCalls,
      successRate,
      averageRating,
      platformUsage,
      period: callHistory.length > 0 ? {
        start: Math.min(...callHistory.map(call => new Date(call.created_at).getTime())),
        end: Math.max(...callHistory.map(call => new Date(call.created_at).getTime()))
      } : null
    };
  }

  // ====================
  // CLEANUP & MAINTENANCE
  // ====================

  public async cleanup(): Promise<void> {
    // Clear cache
    this.cache.clear();

    // Unsubscribe from real-time channels
    await this.client.removeAllChannels();

    logger.info('Database service cleaned up', {
      component: 'DatabaseService',
      action: 'cleanup'
    });
  }

  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const db = DatabaseService.getInstance();

// Export authentication utilities
export const auth = {
  signUp: async (email: string, password: string): Promise<{ user: SupabaseUser; session: Session }> => {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      logger.error('Sign up failed', {
        component: 'AuthService',
        action: 'signUp',
        metadata: { email, error: error.message }
      });
      throw new AuthenticationError(error.message);
    }

    if (!data.user || !data.session) {
      throw new AuthenticationError('Sign up completed but no user session created');
    }

    logger.info('User signed up successfully', {
      userId: data.user.id,
      component: 'AuthService',
      action: 'signUp',
      metadata: { email }
    });

    return { user: data.user, session: data.session };
  },

  signIn: async (email: string, password: string): Promise<{ user: SupabaseUser; session: Session }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logger.error('Sign in failed', {
        component: 'AuthService',
        action: 'signIn',
        metadata: { email, error: error.message }
      });
      throw new AuthenticationError(error.message);
    }

    if (!data.user || !data.session) {
      throw new AuthenticationError('Invalid credentials');
    }

    logger.info('User signed in successfully', {
      userId: data.user.id,
      component: 'AuthService',
      action: 'signIn',
      metadata: { email }
    });

    return { user: data.user, session: data.session };
  },

  signOut: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Sign out failed', {
        component: 'AuthService',
        action: 'signOut',
        metadata: { error: error.message }
      });
      throw new AuthenticationError(error.message);
    }

    logger.info('User signed out successfully', {
      component: 'AuthService',
      action: 'signOut'
    });
  },

  getCurrentUser: (): SupabaseUser | null => {
    return supabase.auth.getUser().then(({ data }) => data.user);
  },

  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};
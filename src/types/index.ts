// Core Domain Types
export interface User {
  readonly id: string;
  email: string;
  name: string;
  partner_name: string;
  partner_phone?: string;
  daily_call_limit: number;
  active_days: string;
  morning_start: string;
  evening_end: string;
  preferred_platforms: string;
  timezone: string;
  is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly version: number;
}

export interface CallHistory {
  readonly id: string;
  readonly user_id: string;
  scheduled_time: string;
  actual_time?: string;
  platform_used?: string;
  status: CallStatus;
  success_rating?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  readonly created_at: string;
}

export interface BlockedTime {
  readonly id: string;
  readonly user_id: string;
  block_name: string;
  start_time: string;
  end_time: string;
  repeat_type: BlockRepeatType;
  days_of_week?: string;
  is_active: boolean;
  priority: number;
  readonly created_at: string;
}

export interface ScheduleHelper {
  readonly id: string;
  readonly user_id: string;
  next_call_due?: string;
  last_call_time?: string;
  calls_today: number;
  daily_reset_date: string;
  last_generated: string;
  readonly updated_at: string;
  readonly lock_version: number;
}

// Enums
export const CallStatus = {
  SUGGESTED: 'suggested',
  CALLED: 'called',
  SKIPPED: 'skipped',
  LATER: 'later',
  FAILED: 'failed',
} as const;

export type CallStatus = typeof CallStatus[keyof typeof CallStatus];

export const BlockRepeatType = {
  DAILY: 'daily',
  WEEKDAYS: 'weekdays',
  WEEKENDS: 'weekends',
  CUSTOM: 'custom',
  ONCE: 'once',
} as const;

export type BlockRepeatType = typeof BlockRepeatType[keyof typeof BlockRepeatType];

export const Platform = {
  PHONE: 'phone',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  TELEGRAM: 'telegram',
  DISCORD: 'discord',
} as const;

export type Platform = typeof Platform[keyof typeof Platform];

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  count?: number;
  status: number;
}

export interface ApiError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  column?: string;
  ascending?: boolean;
}

// Form Types
export interface UserSetupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  partner_name: string;
  partner_phone?: string;
  daily_call_limit: number;
  active_days: string[];
  morning_start: string;
  evening_end: string;
  preferred_platforms: Platform[];
  timezone: string;
}

export interface UserPreferencesForm {
  name: string;
  partner_name: string;
  partner_phone?: string;
  daily_call_limit: number;
  active_days: string[];
  morning_start: string;
  evening_end: string;
  preferred_platforms: Platform[];
  timezone: string;
}

export interface BlockedTimeForm {
  block_name: string;
  start_time: string;
  end_time: string;
  repeat_type: BlockRepeatType;
  days_of_week?: string[];
  is_active: boolean;
  priority: number;
}

export interface CallRatingForm {
  call_id: string;
  success_rating: number;
  notes?: string;
}

// Business Logic Types
export interface CallGenerationOptions {
  user: User;
  blockedTimes: BlockedTime[];
  scheduleHelper: ScheduleHelper;
  minGapMinutes?: number;
  maxGapMinutes?: number;
  maxAttempts?: number;
}

export interface CallValidationResult {
  isValid: boolean;
  reason?: string;
  suggestedTime?: Date;
}

export interface SchedulingResult {
  success: boolean;
  nextCallTime?: Date;
  error?: string;
  metadata?: {
    attempts: number;
    constraints: string[];
    alternatives?: Date[];
  };
}

export interface CallMetrics {
  totalCalls: number;
  successfulCalls: number;
  successRate: number;
  averageRating: number;
  streakDays: number;
  preferredTimes: TimeSlot[];
  platformUsage: Record<Platform, number>;
}

export interface TimeSlot {
  hour: number;
  minute: number;
  frequency: number;
  successRate: number;
}

// UI State Types
export type ViewMode = 'dashboard' | 'settings' | 'history' | 'analytics';

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  currentView: ViewMode;
  isLoading: boolean;
  error: string | null;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
  actionLabel?: string;
  actionCallback?: () => void;
}

export interface DashboardState {
  nextCallTime: Date | null;
  timeUntilCall: string;
  callsToday: number;
  isGenerating: boolean;
  quickActions: QuickAction[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  callback: () => void;
  disabled?: boolean;
}

// Component Props Types
export interface AuthComponentProps {
  onUserCreated: (user: User) => void;
  onError: (error: string) => void;
}

export interface DashboardComponentProps {
  user: User;
  onCallScheduled: (time: Date) => void;
  onCallAttempted: (platform: Platform) => void;
}

export interface SettingsComponentProps {
  user: User;
  onUserUpdated: (user: User) => void;
  onError: (error: string) => void;
}

export interface CallHistoryComponentProps {
  user: User;
  dateRange?: [Date, Date];
  onRatingSubmitted: (callId: string, rating: number) => void;
}

// Hook Types
export interface UseSchedulerReturn {
  generateNextCall: () => Promise<SchedulingResult>;
  isGenerating: boolean;
  error: string | null;
  lastGenerated: Date | null;
}

export interface UseCallHistoryReturn {
  history: CallHistory[];
  metrics: CallMetrics;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addEntry: (entry: Omit<CallHistory, 'id' | 'created_at'>) => Promise<void>;
}

export interface UseUserPreferencesReturn {
  preferences: UserPreferencesForm;
  updatePreferences: (preferences: Partial<UserPreferencesForm>) => Promise<void>;
  isUpdating: boolean;
  error: string | null;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ApiEndpoint = 'users' | 'call_history' | 'blocked_times' | 'schedule_helper';

export type DatabaseFunction = 'generate_next_call' | 'reset_daily_counts' | 'cleanup_old_data';

// Email Service Types
export interface EmailParams {
  to_email: string;
  user_name: string;
  partner_name: string;
  call_time: string;
  app_url: string;
  partner_phone?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

// PWA Types
export interface PWAUpdateInfo {
  isUpdateAvailable: boolean;
  updateSW: () => Promise<void>;
  offlineReady: boolean;
}

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  prompt: () => Promise<boolean>;
}

// Analytics Types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  renderTime: number;
  memoryUsage: number;
}

// Error Types
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

// Constants
export const APP_CONFIG = {
  APP_NAME: 'SpontaneousConnect',
  VERSION: '1.0.0',
  API_TIMEOUT: 10000,
  MAX_RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 300000, // 5 minutes
  NOTIFICATION_DURATION: 5000,
  MAX_CALL_HISTORY_DAYS: 90,
  MIN_CALL_GAP_MINUTES: 45,
  MAX_CALL_GAP_MINUTES: 360,
  DEFAULT_DAILY_LIMIT: 3,
  SUPPORTED_TIMEZONES: [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney',
  ],
} as const;

export const TIME_FORMATS = {
  TIME_24H: 'HH:mm',
  TIME_12H: 'h:mm a',
  DATE_SHORT: 'MMM d, yyyy',
  DATE_LONG: 'MMMM d, yyyy',
  DATETIME_SHORT: 'MMM d, h:mm a',
  DATETIME_LONG: 'MMMM d, yyyy h:mm a',
} as const;
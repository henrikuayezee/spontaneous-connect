/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers
 */

// Timing Constants
export const TIMING = {
  // Call scheduling
  CALL_TIME_TOLERANCE_MINUTES: 5,
  RANDOMIZATION_WINDOW_MINUTES: 30,
  AUTO_GENERATE_DELAY_MS: 1000,
  SKIP_CALL_DELAY_MS: 500,

  // Intervals
  COUNTDOWN_INTERVAL_MS: 1000,

  // Gaps between calls
  DEFAULT_MIN_CALL_GAP_MINUTES: 30,
  DEFAULT_MAX_CALL_GAP_MINUTES: 240,
} as const;

// UI Constants
export const UI = {
  // Animation delays
  NOTIFICATION_AUTO_DISMISS_MS: 5000,

  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;

// Validation Constants
export const VALIDATION = {
  // User input limits
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MIN_PASSWORD_LENGTH: 6,

  // Phone number
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/, // E.164 format

  // Call limits
  MIN_DAILY_CALL_LIMIT: 1,
  MAX_DAILY_CALL_LIMIT: 10,

  // Blocked time
  MIN_BLOCK_NAME_LENGTH: 1,
  MAX_BLOCK_NAME_LENGTH: 50,
} as const;

// Cache Constants
export const CACHE = {
  DEFAULT_TTL_MS: 300000, // 5 minutes
  SHORT_TTL_MS: 150000,   // 2.5 minutes
  LONG_TTL_MS: 600000,    // 10 minutes
} as const;

// Retry Constants
export const RETRY = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000,
  MAX_BACKOFF_MS: 30000,
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_PUSH_NOTIFICATIONS: false, // TODO: Implement
  ENABLE_PWA_UPDATES: false,        // TODO: Implement
} as const;

// Security Constants
export const SECURITY = {
  // Rate limiting (TODO: Implement)
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 900000, // 15 minutes

  // Session
  SESSION_TIMEOUT_MS: 3600000, // 1 hour
} as const;

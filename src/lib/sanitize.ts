/**
 * PII Sanitization Utilities
 * Helpers to remove or hash Personally Identifiable Information from logs and outputs
 */

import { createHash } from 'crypto';

/**
 * Hash a string value for logging purposes
 * Uses SHA-256 to create a consistent hash
 */
export function hashValue(value: string): string {
  if (!value) return '';

  // In browser environment, use Web Crypto API
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // For browser, return a truncated hash indicator
    return `[HASHED:${value.substring(0, 2)}...]`;
  }

  // In Node.js environment (tests, SSR), use crypto module
  try {
    return createHash('sha256').update(value).digest('hex').substring(0, 16);
  } catch {
    // Fallback if crypto is not available
    return `[HASHED:${value.substring(0, 2)}...]`;
  }
}

/**
 * Redact a value completely
 */
export function redactValue(value: string, showLength: boolean = false): string {
  if (!value) return '';

  if (showLength) {
    return `[REDACTED:${value.length}]`;
  }

  return '[REDACTED]';
}

/**
 * Mask phone number, showing only last 4 digits
 */
export function maskPhoneNumber(phone: string | undefined): string {
  if (!phone) return '[NO_PHONE]';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 4) {
    return '***';
  }

  const lastFour = cleaned.slice(-4);
  return `***-***-${lastFour}`;
}

/**
 * Mask email, showing only domain
 */
export function maskEmail(email: string | undefined): string {
  if (!email) return '[NO_EMAIL]';

  const [, domain] = email.split('@');

  if (!domain) {
    return '***@***';
  }

  return `***@${domain}`;
}

/**
 * Mask name, showing only first letter
 */
export function maskName(name: string | undefined): string {
  if (!name) return '[NO_NAME]';

  return `${name.charAt(0)}***`;
}

/**
 * Sanitize user data for logging
 * Removes or masks all PII fields
 */
export function sanitizeUserForLogging(user: {
  id: string;
  email?: string;
  name?: string;
  partner_name?: string;
  partner_phone?: string;
  [key: string]: any;
}): Record<string, any> {
  return {
    userId: user.id,
    email: maskEmail(user.email),
    name: maskName(user.name),
    partnerName: maskName(user.partner_name),
    partnerPhone: maskPhoneNumber(user.partner_phone),
    // Preserve non-PII fields
    dailyCallLimit: user.daily_call_limit,
    activeDays: user.active_days,
    isActive: user.is_active,
  };
}

/**
 * Remove PII from log metadata
 * Recursively sanitizes common PII field names
 */
export function sanitizeLogMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  const piiFields = [
    'email',
    'phone',
    'phoneNumber',
    'partner_phone',
    'name',
    'fullName',
    'firstName',
    'lastName',
    'partner_name',
    'partnerName',
    'address',
    'ssn',
    'creditCard'
  ];

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();

    // Check if this is a PII field
    if (piiFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      // Determine appropriate masking
      if (lowerKey.includes('email')) {
        sanitized[key] = typeof value === 'string' ? maskEmail(value) : value;
      } else if (lowerKey.includes('phone')) {
        sanitized[key] = typeof value === 'string' ? maskPhoneNumber(value) : value;
      } else if (lowerKey.includes('name')) {
        sanitized[key] = typeof value === 'string' ? maskName(value) : value;
      } else {
        sanitized[key] = redactValue(String(value), true);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeLogMetadata(value);
    } else {
      // Keep non-PII fields as-is
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Safe logger wrapper that automatically sanitizes PII
 */
export function createSafeLogger(logger: any) {
  return {
    ...logger,
    info: (message: string, context?: Record<string, any>) => {
      const sanitizedContext = context?.metadata
        ? { ...context, metadata: sanitizeLogMetadata(context.metadata) }
        : context;
      return logger.info(message, sanitizedContext);
    },
    warn: (message: string, context?: Record<string, any>) => {
      const sanitizedContext = context?.metadata
        ? { ...context, metadata: sanitizeLogMetadata(context.metadata) }
        : context;
      return logger.warn(message, sanitizedContext);
    },
    error: (message: string, context?: Record<string, any>) => {
      const sanitizedContext = context?.metadata
        ? { ...context, metadata: sanitizeLogMetadata(context.metadata) }
        : context;
      return logger.error(message, sanitizedContext);
    },
    logUserAction: (action: string, userId: string, metadata?: Record<string, any>) => {
      const sanitizedMetadata = metadata ? sanitizeLogMetadata(metadata) : undefined;
      return logger.logUserAction(action, userId, sanitizedMetadata);
    }
  };
}

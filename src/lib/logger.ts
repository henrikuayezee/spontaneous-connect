/**
 * Professional logging utility with multiple levels and structured output
 * Follows industry best practices for observability and debugging
 */

import { analytics } from '@/lib/analytics';
import { monitoring } from '@/lib/monitoring';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  requestId?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  timestamp: string;
  stack?: string;
  fingerprint?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private isDevelopment: boolean = import.meta.env.DEV;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize: number = 1000;
  private sessionId: string = this.generateSessionId();

  private constructor() {
    // Set log level based on environment
    if (this.isDevelopment) {
      this.logLevel = LogLevel.DEBUG;
    } else {
      this.logLevel = LogLevel.INFO;
    }

    // Setup error boundary for uncaught errors
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        component: 'GlobalErrorHandler',
        action: 'unhandledRejection',
        metadata: {
          reason: event.reason,
          promise: event.promise,
        },
      });

      // Prevent the default browser behavior
      event.preventDefault();
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.error('Uncaught JavaScript Error', {
        component: 'GlobalErrorHandler',
        action: 'uncaughtError',
        metadata: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
        },
      });
    });
  }

  private formatMessage(level: LogLevel, message: string, context: LogContext): LogEntry {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      level,
      message,
      context: {
        ...context,
        sessionId: this.sessionId,
        timestamp,
      },
      timestamp,
    };

    // Add stack trace for errors
    if (level >= LogLevel.ERROR) {
      entry.stack = new Error().stack;
      entry.fingerprint = this.generateFingerprint(message, context);
    }

    return entry;
  }

  private generateFingerprint(message: string, context: LogContext): string {
    const fingerprint = `${message}_${context.component || ''}_${context.action || ''}`;
    return btoa(fingerprint).substring(0, 16);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  private outputToConsole(entry: LogEntry): void {
    if (!this.isDevelopment) return;

    const { level, message, context, timestamp } = entry;
    const prefix = `[${timestamp}] [${LogLevel[level]}]`;

    const style = this.getConsoleStyle(level);
    const contextString = Object.keys(context).length > 0
      ? JSON.stringify(context, null, 2)
      : '';

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`%c${prefix} ${message}`, style, contextString);
        break;
      case LogLevel.INFO:
        console.info(`%c${prefix} ${message}`, style, contextString);
        break;
      case LogLevel.WARN:
        console.warn(`%c${prefix} ${message}`, style, contextString);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(`%c${prefix} ${message}`, style, contextString);
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'color: #6B7280; font-size: 11px;';
      case LogLevel.INFO:
        return 'color: #3B82F6; font-weight: bold;';
      case LogLevel.WARN:
        return 'color: #F59E0B; font-weight: bold;';
      case LogLevel.ERROR:
        return 'color: #EF4444; font-weight: bold;';
      case LogLevel.FATAL:
        return 'color: #FFFFFF; background-color: #DC2626; font-weight: bold; padding: 2px 4px;';
      default:
        return '';
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // In production, send critical logs to external monitoring service
    if (!this.isDevelopment && entry.level >= LogLevel.ERROR) {
      try {
        // Example: Send to Sentry, LogRocket, or custom endpoint
        await this.sendToSentry(entry);
      } catch (error) {
        console.error('Failed to send log to external service:', error);
      }
    }
  }

  private async sendToSentry(entry: LogEntry): Promise<void> {
    // Integration with Sentry
    monitoring.captureException(new Error(entry.message), {
      level: LogLevel[entry.level],
      context: entry.context,
      fingerprint: entry.fingerprint
    });
  }

  public debug(message: string, context: LogContext = {}): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.formatMessage(LogLevel.DEBUG, message, context);
    this.addToBuffer(entry);
    this.outputToConsole(entry);
  }

  public info(message: string, context: LogContext = {}): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.formatMessage(LogLevel.INFO, message, context);
    this.addToBuffer(entry);
    this.outputToConsole(entry);
  }

  public warn(message: string, context: LogContext = {}): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.formatMessage(LogLevel.WARN, message, context);
    this.addToBuffer(entry);
    this.outputToConsole(entry);
    this.sendToExternalService(entry);
  }

  public error(message: string, context: LogContext = {}): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.formatMessage(LogLevel.ERROR, message, context);
    this.addToBuffer(entry);
    this.outputToConsole(entry);
    this.sendToExternalService(entry);
  }

  public fatal(message: string, context: LogContext = {}): void {
    const entry = this.formatMessage(LogLevel.FATAL, message, context);
    this.addToBuffer(entry);
    this.outputToConsole(entry);
    this.sendToExternalService(entry);
  }

  // Utility methods for common logging scenarios
  public logApiCall(method: string, url: string, duration: number, status: number): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `API ${method} ${url} - ${status} (${duration}ms)`;

    const context: LogContext = {
      component: 'APIClient',
      action: 'apiCall',
      metadata: {
        method,
        url,
        duration,
        status,
      },
    };

    if (level === LogLevel.ERROR) {
      this.error(message, context);
    } else {
      this.info(message, context);
    }
  }

  public logUserAction(action: string, userId: string, metadata?: Record<string, unknown>): void {
    this.info(`User action: ${action}`, {
      userId,
      component: 'UserInteraction',
      action,
      metadata,
    });

    // Track in analytics
    analytics.track(action, metadata);
  }

  public logPerformance(metric: string, value: number, context: LogContext = {}): void {
    this.info(`Performance: ${metric} = ${value}ms`, {
      ...context,
      component: 'Performance',
      action: 'measurement',
      metadata: {
        metric,
        value,
        ...context.metadata,
      },
    });
  }

  public logSchedulingEvent(event: string, userId: string, metadata?: Record<string, unknown>): void {
    this.info(`Scheduling: ${event}`, {
      userId,
      component: 'Scheduler',
      action: event,
      metadata,
    });
  }

  // Debugging and monitoring utilities
  public getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  public clearLogBuffer(): void {
    this.logBuffer = [];
  }

  public exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level changed to ${LogLevel[level]}`, {
      component: 'Logger',
      action: 'setLogLevel',
      metadata: { level },
    });
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  // Error boundary integration
  public logReactError(error: Error, errorInfo: { componentStack: string }): void {
    this.error('React Error Boundary caught an error', {
      component: 'ErrorBoundary',
      action: 'componentError',
      metadata: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        componentStack: errorInfo.componentStack,
      },
    });
  }
}

// Create singleton instance
export const logger = Logger.getInstance();

// Export convenient logging functions
export const logDebug = (message: string, context?: LogContext): void =>
  logger.debug(message, context);

export const logInfo = (message: string, context?: LogContext): void =>
  logger.info(message, context);

export const logWarn = (message: string, context?: LogContext): void =>
  logger.warn(message, context);

export const logError = (message: string, context?: LogContext): void =>
  logger.error(message, context);

export const logFatal = (message: string, context?: LogContext): void =>
  logger.fatal(message, context);

// Specialized logging functions
export const logApiCall = (method: string, url: string, duration: number, status: number): void =>
  logger.logApiCall(method, url, duration, status);

export const logUserAction = (action: string, userId: string, metadata?: Record<string, unknown>): void =>
  logger.logUserAction(action, userId, metadata);

export const logPerformance = (metric: string, value: number, context?: LogContext): void =>
  logger.logPerformance(metric, value, context);

export const logSchedulingEvent = (event: string, userId: string, metadata?: Record<string, unknown>): void =>
  logger.logSchedulingEvent(event, userId, metadata);

// Performance monitoring decorator
export function withPerformanceLogging<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  context?: LogContext
): T {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();

    try {
      const result = fn(...args);

      // Handle async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - startTime;
          logPerformance(name, duration, context);
        });
      } else {
        const duration = performance.now() - startTime;
        logPerformance(name, duration, context);
        return result;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      logError(`Function ${name} failed after ${duration}ms`, {
        ...context,
        component: 'PerformanceMonitor',
        action: 'functionError',
        metadata: {
          functionName: name,
          duration,
          error,
        },
      });
      throw error;
    }
  }) as T;
}

// Error handling decorator
export function withErrorLogging<T extends (...args: any[]) => any>(
  fn: T,
  context?: LogContext
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);

      if (result instanceof Promise) {
        return result.catch((error) => {
          logError(`Async function failed: ${fn.name}`, {
            ...context,
            component: 'ErrorHandler',
            action: 'asyncError',
            metadata: {
              functionName: fn.name,
              error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
              },
            },
          });
          throw error;
        });
      }

      return result;
    } catch (error) {
      logError(`Function failed: ${fn.name}`, {
        ...context,
        component: 'ErrorHandler',
        action: 'syncError',
        metadata: {
          functionName: fn.name,
          error: {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack,
          },
        },
      });
      throw error;
    }
  }) as T;
}
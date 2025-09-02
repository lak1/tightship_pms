import { addBreadcrumb, captureError, ErrorCategory } from './sentry'

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  userId?: string
  organizationId?: string
  restaurantId?: string
  operation?: string
  duration?: number
  [key: string]: any
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    const currentEnv = process.env.NODE_ENV
    
    // In test environment, only log errors
    if (currentEnv === 'test') {
      return level === LogLevel.ERROR
    }
    
    // In production, log info and above
    if (currentEnv === 'production') {
      return [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR].includes(level)
    }
    
    // In development, log everything
    return true
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : ''
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`
  }

  private logToConsole(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return

    const formattedMessage = this.formatMessage(level, message, context)
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage)
        break
      case LogLevel.WARN:
        console.warn(formattedMessage)
        break
      case LogLevel.INFO:
        console.info(formattedMessage)
        break
      case LogLevel.DEBUG:
        console.debug(formattedMessage)
        break
    }
  }

  debug(message: string, context?: LogContext) {
    this.logToConsole(LogLevel.DEBUG, message, context)
    
    // Add breadcrumb for debugging
    addBreadcrumb(message, 'debug', 'debug', context)
  }

  info(message: string, context?: LogContext) {
    this.logToConsole(LogLevel.INFO, message, context)
    
    // Add breadcrumb for tracing
    addBreadcrumb(message, 'info', 'info', context)
  }

  warn(message: string, context?: LogContext) {
    this.logToConsole(LogLevel.WARN, message, context)
    
    // Add breadcrumb and capture as warning in Sentry
    addBreadcrumb(message, 'warning', 'warning', context)
    
    if (process.env.NODE_ENV === 'production') {
      captureError(message, ErrorCategory.UNKNOWN, context)
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    this.logToConsole(LogLevel.ERROR, message, { ...context, error: error?.toString() })
    
    // Always capture errors in Sentry (except in test)
    if (process.env.NODE_ENV !== 'test') {
      if (error instanceof Error) {
        captureError(error, ErrorCategory.UNKNOWN, { message, ...context })
      } else {
        captureError(message, ErrorCategory.UNKNOWN, { error, ...context })
      }
    }
  }

  // Specific logging methods for different operations
  auth(operation: string, context?: LogContext) {
    this.info(`Auth: ${operation}`, { operation: 'auth', ...context })
  }

  api(method: string, url: string, statusCode: number, duration?: number, context?: LogContext) {
    const level = statusCode >= 500 ? LogLevel.ERROR : 
                 statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO
    
    const message = `API ${method} ${url} - ${statusCode}${duration ? ` (${duration}ms)` : ''}`
    
    if (level === LogLevel.ERROR) {
      this.error(message, undefined, { method, url, statusCode, duration, ...context })
    } else if (level === LogLevel.WARN) {
      this.warn(message, { method, url, statusCode, duration, ...context })
    } else {
      this.info(message, { method, url, statusCode, duration, ...context })
    }
  }

  database(operation: string, table?: string, duration?: number, context?: LogContext) {
    const message = `DB: ${operation}${table ? ` on ${table}` : ''}${duration ? ` (${duration}ms)` : ''}`
    
    if (duration && duration > 1000) {
      this.warn(`Slow ${message}`, { operation: 'database', table, duration, ...context })
    } else {
      this.debug(message, { operation: 'database', table, duration, ...context })
    }
  }

  integration(service: string, operation: string, success: boolean, duration?: number, context?: LogContext) {
    const message = `Integration ${service}: ${operation} ${success ? 'SUCCESS' : 'FAILED'}${duration ? ` (${duration}ms)` : ''}`
    
    if (!success) {
      this.error(message, undefined, { service, operation, success, duration, ...context })
    } else if (duration && duration > 5000) {
      this.warn(`Slow ${message}`, { service, operation, success, duration, ...context })
    } else {
      this.info(message, { service, operation, success, duration, ...context })
    }
  }

  security(event: string, severity: 'low' | 'medium' | 'high', context?: LogContext) {
    const message = `Security ${severity.toUpperCase()}: ${event}`
    
    switch (severity) {
      case 'high':
        this.error(message, undefined, { event: 'security', severity, ...context })
        break
      case 'medium':
        this.warn(message, { event: 'security', severity, ...context })
        break
      case 'low':
        this.info(message, { event: 'security', severity, ...context })
        break
    }
  }

  performance(operation: string, duration: number, threshold = 1000, context?: LogContext) {
    const message = `Performance: ${operation} took ${duration}ms`
    
    if (duration > threshold) {
      this.warn(`Slow operation: ${message}`, { operation: 'performance', duration, threshold, ...context })
    } else {
      this.debug(message, { operation: 'performance', duration, threshold, ...context })
    }
  }

  // Timer utility for measuring operation duration
  time(label: string) {
    const start = Date.now()
    
    return {
      end: (context?: LogContext) => {
        const duration = Date.now() - start
        this.performance(label, duration, 1000, context)
        return duration
      }
    }
  }

  // Request logger middleware helper
  request(req: { method: string; url: string }, res: { statusCode: number }, duration: number, context?: LogContext) {
    this.api(req.method, req.url, res.statusCode, duration, context)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => logger.error(message, error, context),
  
  auth: (operation: string, context?: LogContext) => logger.auth(operation, context),
  api: (method: string, url: string, statusCode: number, duration?: number, context?: LogContext) => 
    logger.api(method, url, statusCode, duration, context),
  database: (operation: string, table?: string, duration?: number, context?: LogContext) => 
    logger.database(operation, table, duration, context),
  integration: (service: string, operation: string, success: boolean, duration?: number, context?: LogContext) => 
    logger.integration(service, operation, success, duration, context),
  security: (event: string, severity: 'low' | 'medium' | 'high', context?: LogContext) => 
    logger.security(event, severity, context),
  performance: (operation: string, duration: number, threshold?: number, context?: LogContext) => 
    logger.performance(operation, duration, threshold, context),
  
  time: (label: string) => logger.time(label),
  request: (req: { method: string; url: string }, res: { statusCode: number }, duration: number, context?: LogContext) =>
    logger.request(req, res, duration, context),
}

export default logger
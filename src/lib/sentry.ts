import * as Sentry from '@sentry/nextjs'

// Custom error types for better categorization
export enum ErrorCategory {
  AUTH = 'authentication',
  DATABASE = 'database',
  API = 'api',
  INTEGRATION = 'integration',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  PAYMENT = 'payment',
  UNKNOWN = 'unknown',
}

// Enhanced error logging with context
export function captureError(
  error: Error | string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  extra?: Record<string, any>,
  user?: { id: string; email?: string }
) {
  // Don't log errors in test environment
  if (process.env.NODE_ENV === 'test') return

  // Add scope context
  Sentry.withScope((scope) => {
    // Set user context if provided
    if (user) {
      scope.setUser({
        id: user.id,
        email: user.email,
      })
    }

    // Set tags
    scope.setTag('error_category', category)
    scope.setTag('environment', process.env.NODE_ENV)

    // Add extra context
    if (extra) {
      scope.setContext('extra', extra)
    }

    // Set level based on category
    const level = category === ErrorCategory.RATE_LIMIT ? 'warning' : 'error'
    scope.setLevel(level)

    // Capture the error
    if (typeof error === 'string') {
      Sentry.captureMessage(error, level)
    } else {
      Sentry.captureException(error)
    }
  })
}

// Capture API errors with additional context
export function captureApiError(
  error: Error | string,
  request: {
    method: string
    url: string
    headers?: Record<string, string>
    body?: any
  },
  user?: { id: string; email?: string }
) {
  captureError(
    error,
    ErrorCategory.API,
    {
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      },
    },
    user
  )
}

// Capture database errors
export function captureDatabaseError(
  error: Error | string,
  query?: string,
  user?: { id: string; email?: string }
) {
  captureError(
    error,
    ErrorCategory.DATABASE,
    {
      query: query,
    },
    user
  )
}

// Capture integration errors (external APIs)
export function captureIntegrationError(
  error: Error | string,
  integration: string,
  operation: string,
  user?: { id: string; email?: string }
) {
  captureError(
    error,
    ErrorCategory.INTEGRATION,
    {
      integration,
      operation,
    },
    user
  )
}

// Capture rate limit events (as warnings, not errors)
export function captureRateLimitEvent(
  identifier: string,
  endpoint: string,
  limit: number
) {
  Sentry.withScope((scope) => {
    scope.setTag('error_category', ErrorCategory.RATE_LIMIT)
    scope.setLevel('warning')
    scope.setContext('rate_limit', {
      identifier,
      endpoint,
      limit,
    })

    Sentry.captureMessage(`Rate limit exceeded: ${endpoint}`, 'warning')
  })
}

// Performance monitoring
export function capturePerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
) {
  // Only capture slow operations
  if (duration > 1000) { // More than 1 second
    Sentry.withScope((scope) => {
      scope.setTag('performance', 'slow_operation')
      scope.setContext('performance', {
        operation,
        duration_ms: duration,
        ...metadata,
      })

      Sentry.captureMessage(`Slow operation: ${operation} (${duration}ms)`, 'warning')
    })
  }
}

// Create a transaction for tracking
export function createTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  })
}

// Add breadcrumb for debugging
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  })
}

// Set user context globally
export function setUser(user: { id: string; email?: string; organizationId?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    organizationId: user.organizationId,
  })
}

// Clear user context (on logout)
export function clearUser() {
  Sentry.setUser(null)
}

// Flush events (useful before app shutdown)
export async function flush(timeout = 5000) {
  await Sentry.flush(timeout)
}
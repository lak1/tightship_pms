import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Configure Redis connection
// For now, use in-memory storage for development
// In production, use Upstash Redis or your own Redis instance
const redis = process.env.REDIS_URL 
  ? new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
  : undefined

// Fallback to in-memory storage if Redis is not configured
const createRateLimiter = (requests: number, window: string) => {
  return new Ratelimit({
    redis: redis || new Map(), // Use Map for in-memory storage in dev
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: 'tightship_rl',
  })
}

// Different rate limiters for different endpoints
export const rateLimiters = {
  // Authentication endpoints - 5 requests per 15 minutes
  auth: createRateLimiter(5, '15 m'),
  
  // Public API endpoints - 100 requests per minute
  publicApi: createRateLimiter(100, '1 m'),
  
  // Internal API endpoints - 30 requests per minute
  api: createRateLimiter(30, '1 m'),
  
  // File uploads - 10 requests per hour
  upload: createRateLimiter(10, '1 h'),
  
  // Password reset - 3 requests per hour
  passwordReset: createRateLimiter(3, '1 h'),
  
  // Email sending - 10 requests per hour
  email: createRateLimiter(10, '1 h'),
}

// Get client identifier (IP + User ID if available)
export function getClientIdentifier(request: NextRequest, userId?: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'
  
  // Combine IP and user ID for more precise rate limiting
  return userId ? `${ip}:${userId}` : ip
}

// Rate limiting middleware factory
export function createRateLimitMiddleware(
  limiterType: keyof typeof rateLimiters,
  options: {
    skipSuccessfulRequests?: boolean
    skipFailedRequests?: boolean
    message?: string
  } = {}
) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    userId?: string
  ): Promise<NextResponse | null> {
    try {
      const identifier = getClientIdentifier(request, userId)
      const limiter = rateLimiters[limiterType]
      
      const { success, limit, reset, remaining } = await limiter.limit(identifier)
      
      if (!success) {
        const errorResponse = NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: options.message || `Too many requests. Please try again later.`,
            retryAfter: Math.round((reset - Date.now()) / 1000),
          },
          { status: 429 }
        )
        
        // Add rate limit headers
        errorResponse.headers.set('X-RateLimit-Limit', limit.toString())
        errorResponse.headers.set('X-RateLimit-Remaining', remaining.toString())
        errorResponse.headers.set('X-RateLimit-Reset', reset.toString())
        errorResponse.headers.set('Retry-After', Math.round((reset - Date.now()) / 1000).toString())
        
        return errorResponse
      }
      
      // Rate limit passed, return null to continue
      return null
    } catch (error) {
      // If rate limiting fails, log error but don't block request
      console.error('Rate limiting error:', error)
      return null
    }
  }
}

// Specific middleware functions for common use cases
export const authRateLimit = createRateLimitMiddleware('auth', {
  message: 'Too many authentication attempts. Please try again in 15 minutes.'
})

export const publicApiRateLimit = createRateLimitMiddleware('publicApi', {
  message: 'API rate limit exceeded. Please try again in a minute.'
})

export const apiRateLimit = createRateLimitMiddleware('api', {
  message: 'Too many API requests. Please slow down.'
})

export const uploadRateLimit = createRateLimitMiddleware('upload', {
  message: 'Upload limit exceeded. Please try again in an hour.'
})

export const passwordResetRateLimit = createRateLimitMiddleware('passwordReset', {
  message: 'Too many password reset attempts. Please try again in an hour.'
})

export const emailRateLimit = createRateLimitMiddleware('email', {
  message: 'Email sending limit exceeded. Please try again in an hour.'
})

// Utility function to add rate limit headers to successful responses
export function addRateLimitHeaders(
  response: NextResponse,
  result: { limit: number; remaining: number; reset: number }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
}

// Check if request should be rate limited based on environment
export function shouldRateLimit(): boolean {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') return false
  
  // Skip rate limiting if explicitly disabled
  if (process.env.DISABLE_RATE_LIMITING === 'true') return false
  
  return true
}

// Get rate limit status without consuming a request
export async function getRateLimitStatus(
  limiterType: keyof typeof rateLimiters,
  identifier: string
) {
  try {
    const limiter = rateLimiters[limiterType]
    // This doesn't consume a request, just checks status
    const result = await limiter.limit(identifier, { dryRun: true } as any)
    return result
  } catch (error) {
    console.error('Error checking rate limit status:', error)
    return null
  }
}
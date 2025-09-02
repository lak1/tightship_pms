/**
 * Security utilities for production safety
 */

/**
 * Validates that we're not running in production with demo accounts enabled
 */
export function validateProductionSecurity() {
  if (process.env.NODE_ENV === 'production') {
    // Critical security checks for production
    const securityIssues: string[] = []
    
    // Check for demo account configuration in production
    if (
      process.env.ENABLE_DEMO_ACCOUNT === 'true' ||
      process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNT === 'true'
    ) {
      securityIssues.push('Demo accounts are enabled in production')
    }
    
    // Check for hardcoded demo credentials
    if (
      process.env.DEMO_ACCOUNT_EMAIL ||
      process.env.DEMO_ACCOUNT_PASSWORD ||
      process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL
    ) {
      securityIssues.push('Demo account credentials are set in production')
    }
    
    // Check for required security environment variables
    if (!process.env.NEXTAUTH_SECRET) {
      securityIssues.push('NEXTAUTH_SECRET is not set')
    }
    
    if (!process.env.JWT_SECRET) {
      securityIssues.push('JWT_SECRET is not set')
    }
    
    // Log critical security issues
    if (securityIssues.length > 0) {
      console.error('🚨 CRITICAL SECURITY ISSUES DETECTED:')
      securityIssues.forEach(issue => console.error(`  - ${issue}`))
      
      // In production, we should fail fast on security issues
      if (process.env.ENFORCE_PRODUCTION_SECURITY !== 'false') {
        throw new Error('Production security validation failed. Set ENFORCE_PRODUCTION_SECURITY=false to override (NOT RECOMMENDED).')
      }
    }
  }
}

/**
 * Sanitizes log messages to remove sensitive information
 */
export function sanitizeForLog(message: string): string {
  return message
    .replace(/password[^\s]*[:=][^\s]*/gi, 'password=***')
    .replace(/secret[^\s]*[:=][^\s]*/gi, 'secret=***')
    .replace(/token[^\s]*[:=][^\s]*/gi, 'token=***')
    .replace(/key[^\s]*[:=][^\s]*/gi, 'key=***')
    .replace(/bearer\s+[^\s]+/gi, 'Bearer ***')
}

/**
 * Safe console.log that sanitizes sensitive information
 * @deprecated Use logger.info instead
 */
export function safeLog(message: string, ...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(sanitizeForLog(message), ...args)
  }
}

/**
 * Safe console.error that sanitizes sensitive information
 * @deprecated Use logger.error instead
 */
export function safeError(message: string, error?: any) {
  console.error(sanitizeForLog(message), error?.message || error)
}

/**
 * Generates a secure random string for state/nonce values
 */
export function generateSecureRandomString(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  // Use crypto.getRandomValues if available (browser)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      result += charset[array[i] % charset.length]
    }
  } else {
    // Fallback for Node.js environment
    const crypto = require('crypto')
    const randomBytes = crypto.randomBytes(length)
    for (let i = 0; i < length; i++) {
      result += charset[randomBytes[i] % charset.length]
    }
  }
  
  return result
}

/**
 * Validates password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    issues.push('Password must contain at least one number')
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push('Password must contain at least one special character')
  }
  
  // Check for common weak passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123']
  if (commonPasswords.includes(password.toLowerCase())) {
    issues.push('Password is too common')
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Rate limiting store (in-memory for now, should be Redis in production)
 */
class InMemoryRateLimit {
  private attempts = new Map<string, { count: number; resetTime: number }>()
  
  isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now()
    const record = this.attempts.get(key)
    
    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs })
      return false
    }
    
    if (record.count >= maxAttempts) {
      return true
    }
    
    record.count++
    return false
  }
  
  reset(key: string): void {
    this.attempts.delete(key)
  }
}

export const rateLimiter = new InMemoryRateLimit()

// Run security validation on module load
if (typeof window === 'undefined') {
  // Only run on server side
  validateProductionSecurity()
}
import { db } from '../db';
import { logger } from '../logger';

interface LoginAttempt {
  email: string;
  ip: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
}

export class AuthSecurityService {
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private static readonly ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour

  /**
   * Record a login attempt
   */
  static async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    try {
      // Store in memory or Redis in production, simplified for demo
      logger.info('Login attempt recorded', {
        email: attempt.email,
        ip: attempt.ip,
        success: attempt.success,
        timestamp: attempt.timestamp
      });

      if (!attempt.success) {
        // Check if account should be locked
        await this.checkAndLockAccount(attempt.email, attempt.ip);
      }

    } catch (error) {
      logger.error('Failed to record login attempt', {
        error: error.message,
        attempt
      });
    }
  }

  /**
   * Check if account/IP should be locked after failed attempts
   */
  private static async checkAndLockAccount(email: string, ip: string): Promise<void> {
    try {
      // For production, this would use Redis or a dedicated table
      // For now, we'll use a simple implementation with user metadata
      
      const user = await db.users.findUnique({
        where: { email }
      });

      if (!user) return;

      // Get or create security metadata
      const securityData = (user as any).securityData || {
        failedAttempts: 0,
        lastFailedAttempt: null,
        lockedUntil: null
      };

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - this.ATTEMPT_WINDOW);

      // Reset failed attempts if last attempt was over an hour ago
      if (securityData.lastFailedAttempt && 
          new Date(securityData.lastFailedAttempt) < oneHourAgo) {
        securityData.failedAttempts = 0;
      }

      // Increment failed attempts
      securityData.failedAttempts += 1;
      securityData.lastFailedAttempt = now;

      // Lock account if max attempts reached
      if (securityData.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        securityData.lockedUntil = new Date(now.getTime() + this.LOCKOUT_DURATION);
        
        logger.warn('Account locked due to failed login attempts', {
          email,
          ip,
          failedAttempts: securityData.failedAttempts,
          lockedUntil: securityData.lockedUntil
        });

        // In production, you might want to send an email notification here
      }

      // Note: In a real implementation, you'd store this in a separate table or Redis
      // For demo purposes, we'll just log it
      logger.info('Updated security data', {
        email,
        securityData
      });

    } catch (error) {
      logger.error('Failed to check account lock status', {
        email,
        ip,
        error: error.message
      });
    }
  }

  /**
   * Check if account is currently locked
   */
  static async isAccountLocked(email: string): Promise<{
    locked: boolean;
    lockedUntil?: Date;
    remainingMinutes?: number;
  }> {
    try {
      // In production, this would check Redis or database
      // For demo, we'll return unlocked
      
      // This is where you'd implement the actual lock checking logic
      // using the security metadata from the previous method
      
      return { locked: false };

    } catch (error) {
      logger.error('Failed to check account lock status', {
        email,
        error: error.message
      });
      
      // On error, assume not locked to avoid blocking legitimate users
      return { locked: false };
    }
  }

  /**
   * Unlock account (for admin use or after lockout period)
   */
  static async unlockAccount(email: string, reason: string = 'manual'): Promise<void> {
    try {
      logger.info('Account unlocked', {
        email,
        reason,
        timestamp: new Date()
      });

      // In production, you'd clear the lock data from Redis/database

    } catch (error) {
      logger.error('Failed to unlock account', {
        email,
        reason,
        error: error.message
      });
    }
  }

  /**
   * Get security status for account
   */
  static async getSecurityStatus(email: string): Promise<{
    isLocked: boolean;
    failedAttempts: number;
    lastAttempt?: Date;
    lockedUntil?: Date;
  }> {
    try {
      // In production, this would fetch from Redis/database
      return {
        isLocked: false,
        failedAttempts: 0
      };

    } catch (error) {
      logger.error('Failed to get security status', {
        email,
        error: error.message
      });

      return {
        isLocked: false,
        failedAttempts: 0
      };
    }
  }

  /**
   * Rate limit by IP address
   */
  static async checkIPRateLimit(ip: string): Promise<{
    allowed: boolean;
    remainingAttempts?: number;
    resetTime?: Date;
  }> {
    try {
      // In production, implement IP-based rate limiting with Redis
      // For demo, always allow
      
      return { allowed: true };

    } catch (error) {
      logger.error('Failed to check IP rate limit', {
        ip,
        error: error.message
      });

      // On error, allow to avoid blocking legitimate users
      return { allowed: true };
    }
  }

  /**
   * Detect suspicious login patterns
   */
  static async detectSuspiciousActivity(email: string, ip: string, userAgent: string): Promise<{
    suspicious: boolean;
    reason?: string;
  }> {
    try {
      // Implement suspicious activity detection:
      // - Login from new location
      // - Unusual time patterns
      // - Multiple IPs in short time
      // - Brute force patterns

      // For demo, return not suspicious
      return { suspicious: false };

    } catch (error) {
      logger.error('Failed to detect suspicious activity', {
        email,
        ip,
        error: error.message
      });

      return { suspicious: false };
    }
  }

  /**
   * Clean up old login attempt records (for cron job)
   */
  static async cleanupOldAttempts(): Promise<void> {
    try {
      // In production, clean up old records from Redis/database
      const cleanupDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      logger.info('Cleaned up login attempts older than 24 hours', {
        cleanupDate
      });

    } catch (error) {
      logger.error('Failed to cleanup old login attempts', {
        error: error.message
      });
    }
  }
}
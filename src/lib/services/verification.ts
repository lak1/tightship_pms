import { db } from '../db';
import { EmailService } from '../email';
import { logger } from '../logger';
import crypto from 'crypto';

export type VerificationType = 'email_verification' | 'password_reset';

export class VerificationService {
  /**
   * Generate and send verification email
   */
  static async sendVerificationEmail(email: string, userName: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Check if user exists and isn't already verified
      const user = await db.users.findUnique({
        where: { email }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.emailVerified) {
        return { success: false, error: 'Email already verified' };
      }

      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // 24-hour expiry

      // Store verification token
      await db.verification_tokens.create({
        data: {
          id: `verify_${Date.now()}_${Math.random()}`,
          email,
          token,
          type: 'email_verification',
          expires
        }
      });

      // Send verification email
      const emailResult = await EmailService.sendVerificationEmail(
        email,
        userName,
        token
      );

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      logger.info('Verification email sent', {
        email,
        messageId: emailResult.messageId
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to send verification email', {
        email,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Find and validate token
      const verificationToken = await db.verification_tokens.findUnique({
        where: { token }
      });

      if (!verificationToken) {
        return {
          success: false,
          error: 'Invalid verification token'
        };
      }

      if (verificationToken.used) {
        return {
          success: false,
          error: 'Verification token has already been used'
        };
      }

      if (verificationToken.expires < new Date()) {
        return {
          success: false,
          error: 'Verification token has expired'
        };
      }

      if (verificationToken.type !== 'email_verification') {
        return {
          success: false,
          error: 'Invalid token type'
        };
      }

      // Find user
      const user = await db.users.findUnique({
        where: { email: verificationToken.email }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      if (user.emailVerified) {
        return {
          success: false,
          error: 'Email is already verified'
        };
      }

      // Update user and mark token as used
      await db.$transaction([
        db.users.update({
          where: { email: verificationToken.email },
          data: { emailVerified: new Date() }
        }),
        db.verification_tokens.update({
          where: { token },
          data: { used: true }
        })
      ]);

      logger.info('Email verified successfully', {
        email: verificationToken.email,
        userId: user.id
      });

      return {
        success: true,
        message: 'Email verified successfully!'
      };

    } catch (error) {
      logger.error('Email verification failed', {
        token,
        error: error.message
      });

      return {
        success: false,
        error: 'Verification failed. Please try again.'
      };
    }
  }

  /**
   * Generate and send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Check if user exists
      const user = await db.users.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if user exists for security
        return { success: true }; // Always return success
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 1); // 1-hour expiry

      // Invalidate any existing password reset tokens
      await db.verification_tokens.updateMany({
        where: {
          email,
          type: 'password_reset',
          used: false
        },
        data: { used: true }
      });

      // Store reset token
      await db.verification_tokens.create({
        data: {
          id: `reset_${Date.now()}_${Math.random()}`,
          email,
          token,
          type: 'password_reset',
          expires
        }
      });

      // Send reset email
      const emailResult = await EmailService.sendPasswordResetEmail(
        email,
        user.name || 'User',
        token
      );

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      logger.info('Password reset email sent', {
        email,
        messageId: emailResult.messageId
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to send password reset email', {
        email,
        error: error.message
      });

      // Always return success for security (don't reveal if user exists)
      return { success: true };
    }
  }

  /**
   * Verify password reset token
   */
  static async verifyPasswordResetToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    error?: string;
  }> {
    try {
      const verificationToken = await db.verification_tokens.findUnique({
        where: { token }
      });

      if (!verificationToken) {
        return { valid: false, error: 'Invalid reset token' };
      }

      if (verificationToken.used) {
        return { valid: false, error: 'Reset token has already been used' };
      }

      if (verificationToken.expires < new Date()) {
        return { valid: false, error: 'Reset token has expired' };
      }

      if (verificationToken.type !== 'password_reset') {
        return { valid: false, error: 'Invalid token type' };
      }

      return {
        valid: true,
        email: verificationToken.email
      };

    } catch (error) {
      logger.error('Password reset token verification failed', {
        token,
        error: error.message
      });

      return {
        valid: false,
        error: 'Token verification failed'
      };
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Verify token
      const tokenVerification = await this.verifyPasswordResetToken(token);
      
      if (!tokenVerification.valid) {
        return {
          success: false,
          error: tokenVerification.error
        };
      }

      const email = tokenVerification.email!;

      // Hash password (assuming you're using bcrypt)
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and mark token as used
      await db.$transaction([
        db.users.update({
          where: { email },
          data: { password: hashedPassword }
        }),
        db.verification_tokens.update({
          where: { token },
          data: { used: true }
        })
      ]);

      logger.info('Password reset successfully', { email });

      return {
        success: true,
        message: 'Password reset successfully!'
      };

    } catch (error) {
      logger.error('Password reset failed', {
        token,
        error: error.message
      });

      return {
        success: false,
        error: 'Password reset failed. Please try again.'
      };
    }
  }

  /**
   * Clean up expired tokens (to be run via cron job)
   */
  static async cleanupExpiredTokens() {
    try {
      const result = await db.verification_tokens.deleteMany({
        where: {
          OR: [
            { expires: { lt: new Date() } },
            { used: true, createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Delete used tokens older than 7 days
          ]
        }
      });

      logger.info(`Cleaned up ${result.count} expired/used verification tokens`);

    } catch (error) {
      logger.error('Token cleanup failed', { error: error.message });
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(email: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const user = await db.users.findUnique({
        where: { email }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.emailVerified) {
        return { success: false, error: 'Email is already verified' };
      }

      // Invalidate existing verification tokens
      await db.verification_tokens.updateMany({
        where: {
          email,
          type: 'email_verification',
          used: false
        },
        data: { used: true }
      });

      // Send new verification email
      return await this.sendVerificationEmail(email, user.name || 'User');

    } catch (error) {
      logger.error('Failed to resend verification email', {
        email,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }
}
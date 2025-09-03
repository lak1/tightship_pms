import { Resend } from 'resend';
import { render } from '@react-email/render';
import { logger } from './logger';
import { WelcomeEmail } from '@/emails/templates/welcome-email';
import { VerifyEmail } from '@/emails/templates/verify-email';
import { ResetPassword } from '@/emails/templates/reset-password';
import { SubscriptionConfirmation } from '@/emails/templates/subscription-confirmation';
import { UsageLimitWarning } from '@/emails/templates/usage-limit-warning';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: React.ReactElement;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class EmailService {
  private static readonly DEFAULT_FROM = process.env.EMAIL_FROM || 'Tightship PMS <hello@tightshippms.com>';
  private static readonly SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@tightshippms.com';

  /**
   * Send an email using Resend
   */
  static async sendEmail(options: EmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Validate required fields
      if (!options.to || !options.subject) {
        throw new Error('Missing required email fields: to, subject');
      }

      if (!options.html && !options.text && !options.react) {
        throw new Error('Email must have either html, text, or react content');
      }

      // Check if Resend is configured
      if (!process.env.RESEND_API_KEY) {
        logger.warn('RESEND_API_KEY not configured. Email will be logged instead of sent.', {
          to: options.to,
          subject: options.subject
        });

        // In development, just log the email instead of sending
        console.log('📧 EMAIL (Development Mode):');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Content: ${options.text || 'HTML/React content'}`);
        
        return { success: true, messageId: 'dev-mode-' + Date.now() };
      }

      // Send email via Resend
      const response = await resend.emails.send({
        from: options.from || this.DEFAULT_FROM,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        react: options.react,
        replyTo: options.replyTo,
        attachments: options.attachments
      });

      if (response.error) {
        throw new Error(`Resend API error: ${response.error.message}`);
      }

      logger.info('Email sent successfully', {
        messageId: response.data?.id,
        to: options.to,
        subject: options.subject
      });

      return {
        success: true,
        messageId: response.data?.id
      };

    } catch (error) {
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send welcome email to new user
   */
  static async sendWelcomeEmail(
    to: string,
    userName: string,
    organizationName?: string
  ) {
    const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`;
    
    return this.sendEmail({
      to,
      subject: `Welcome to Tightship PMS${organizationName ? ` - ${organizationName}` : ''}!`,
      react: WelcomeEmail({
        userName,
        organizationName,
        dashboardUrl
      }),
    });
  }

  /**
   * Send email verification
   */
  static async sendVerificationEmail(
    to: string,
    userName: string,
    verificationToken: string
  ) {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${verificationToken}`;

    return this.sendEmail({
      to,
      subject: 'Verify your email address - Tightship PMS',
      react: VerifyEmail({
        userName,
        verificationUrl
      }),
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    to: string,
    userName: string,
    resetToken: string
  ) {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to,
      subject: 'Reset your password - Tightship PMS',
      react: ResetPassword({
        userName,
        resetUrl
      }),
    });
  }

  /**
   * Send subscription confirmation email
   */
  static async sendSubscriptionConfirmationEmail(
    to: string,
    userName: string,
    planName: string,
    amount: number,
    nextBillingDate: Date
  ) {
    const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`;
    
    return this.sendEmail({
      to,
      subject: `Subscription confirmed - ${planName} Plan`,
      react: SubscriptionConfirmation({
        userName,
        planName,
        amount,
        nextBillingDate: nextBillingDate.toLocaleDateString(),
        dashboardUrl
      }),
    });
  }

  /**
   * Send payment failed email
   */
  static async sendPaymentFailedEmail(
    to: string,
    userName: string,
    planName: string,
    amount: number,
    retryDate: Date
  ) {
    return this.sendEmail({
      to,
      subject: 'Payment failed - Action required',
      text: `Hi ${userName},\n\nWe were unable to process your payment for the ${planName} plan ($${amount}).\n\nPlease update your payment method to avoid service interruption. We'll retry payment on ${retryDate.toLocaleDateString()}.\n\nUpdate your payment method: ${process.env.NEXTAUTH_URL}/billing\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nThe Tightship Team`,
    });
  }

  /**
   * Send usage limit warning email
   */
  static async sendUsageLimitWarningEmail(
    to: string,
    userName: string,
    metricType: string,
    currentUsage: number,
    limit: number,
    percentage: number
  ) {
    const upgradeUrl = `${process.env.NEXTAUTH_URL}/billing`;
    
    return this.sendEmail({
      to,
      subject: `Usage limit warning - ${percentage.toFixed(0)}% of ${metricType} limit reached`,
      react: UsageLimitWarning({
        userName,
        metricType,
        currentUsage,
        limit,
        percentage,
        upgradeUrl
      }),
    });
  }

  /**
   * Send monthly usage report email
   */
  static async sendMonthlyUsageReportEmail(
    to: string,
    userName: string,
    organizationName: string,
    usageStats: {
      restaurants: { usage: number; limit: number };
      products: { usage: number; limit: number };
      apiCalls: { usage: number; limit: number };
    },
    planName: string
  ) {
    const formatLimit = (limit: number) => limit === -1 ? 'Unlimited' : limit.toLocaleString();

    return this.sendEmail({
      to,
      subject: `Monthly usage report - ${organizationName}`,
      text: `Hi ${userName},\n\nHere's your monthly usage report for ${organizationName}:\n\n📊 USAGE SUMMARY (${planName} Plan)\n\n🏪 Restaurants: ${usageStats.restaurants.usage} / ${formatLimit(usageStats.restaurants.limit)}\n📦 Products: ${usageStats.products.usage} / ${formatLimit(usageStats.products.limit)}\n🔌 API Calls: ${usageStats.apiCalls.usage.toLocaleString()} / ${formatLimit(usageStats.apiCalls.limit)}\n\nView detailed analytics: ${process.env.NEXTAUTH_URL}/dashboard\n\nThank you for using Tightship PMS!\n\nBest regards,\nThe Tightship Team`,
    });
  }

  /**
   * Send test email (for development/testing)
   */
  static async sendTestEmail(to: string) {
    return this.sendEmail({
      to,
      subject: 'Test Email - Tightship PMS',
      text: 'This is a test email from Tightship PMS. If you received this, the email service is working correctly!',
    });
  }
}
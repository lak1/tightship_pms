import { NextRequest, NextResponse } from 'next/server';
import { VerificationService } from '@/lib/services/verification';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, token, password } = body;

    // Handle password reset request (send email)
    if (email && !token && !password) {
      const result = await VerificationService.sendPasswordResetEmail(email);

      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Handle password reset confirmation (with token and new password)
    if (token && password) {
      // Basic password validation
      if (password.length < 8) {
        return NextResponse.json({
          error: 'Password must be at least 8 characters long'
        }, { status: 400 });
      }

      const result = await VerificationService.resetPassword(token, password);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message
        });
      } else {
        return NextResponse.json({
          error: result.error
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      error: 'Invalid request. Provide either email or token with password.'
    }, { status: 400 });

  } catch (error) {
    logger.error('Password reset API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({
        error: 'Reset token is required'
      }, { status: 400 });
    }

    const result = await VerificationService.verifyPasswordResetToken(token);

    if (result.valid) {
      return NextResponse.json({
        valid: true,
        email: result.email
      });
    } else {
      return NextResponse.json({
        valid: false,
        error: result.error
      }, { status: 400 });
    }

  } catch (error) {
    logger.error('Password reset token verification API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
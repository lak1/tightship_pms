import { NextRequest, NextResponse } from 'next/server';
import { VerificationService } from '@/lib/services/verification';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({
        error: 'Verification token is required'
      }, { status: 400 });
    }

    const result = await VerificationService.verifyEmail(token);

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

  } catch (error) {
    logger.error('Email verification API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({
        error: 'Email is required'
      }, { status: 400 });
    }

    const result = await VerificationService.resendVerificationEmail(email);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } else {
      return NextResponse.json({
        error: result.error
      }, { status: 400 });
    }

  } catch (error) {
    logger.error('Resend verification email API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
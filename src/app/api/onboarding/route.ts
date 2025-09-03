import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OnboardingService } from '@/lib/services/onboarding';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get user from database
    const { db } = await import('@/lib/db');
    const user = await db.users.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // Get onboarding progress
    const progress = await OnboardingService.getOnboardingProgress(user.id);

    return NextResponse.json({
      success: true,
      ...progress
    });

  } catch (error) {
    logger.error('Onboarding progress API error:', error);
    
    return NextResponse.json({
      error: 'Failed to get onboarding progress'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { step, action, ...data } = body;

    if (!session?.user?.email) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get user from database
    const { db } = await import('@/lib/db');
    const user = await db.users.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // Handle different onboarding actions
    switch (action) {
      case 'create_organization':
        const { organizationName, organizationType } = data;
        
        if (!organizationName) {
          return NextResponse.json({
            error: 'Organization name is required'
          }, { status: 400 });
        }

        const orgResult = await OnboardingService.createOrganization(
          user.id,
          organizationName,
          organizationType
        );

        if (orgResult.success) {
          return NextResponse.json({
            success: true,
            message: 'Organization created successfully!',
            organizationId: orgResult.organizationId,
            nextStep: orgResult.nextStep
          });
        } else {
          return NextResponse.json({
            error: orgResult.error
          }, { status: 400 });
        }

      case 'create_restaurant':
        if (!user.organizationId) {
          return NextResponse.json({
            error: 'No organization found. Please create an organization first.'
          }, { status: 400 });
        }

        const { restaurantName, restaurantAddress, timezone } = data;
        
        if (!restaurantName) {
          return NextResponse.json({
            error: 'Restaurant name is required'
          }, { status: 400 });
        }

        const restResult = await OnboardingService.createFirstRestaurant(
          user.organizationId,
          {
            name: restaurantName,
            address: restaurantAddress,
            timezone
          }
        );

        if (restResult.success) {
          return NextResponse.json({
            success: true,
            message: 'Restaurant created successfully!',
            restaurantId: restResult.restaurantId,
            nextStep: restResult.nextStep
          });
        } else {
          return NextResponse.json({
            error: restResult.error
          }, { status: 400 });
        }

      case 'skip_step':
        if (!user.organizationId) {
          return NextResponse.json({
            error: 'No organization found'
          }, { status: 400 });
        }

        const { stepId } = data;
        
        if (!stepId) {
          return NextResponse.json({
            error: 'Step ID is required'
          }, { status: 400 });
        }

        const skipResult = await OnboardingService.skipStep(
          user.organizationId,
          stepId
        );

        if (skipResult.success) {
          return NextResponse.json({
            success: true,
            message: 'Step skipped successfully',
            nextStep: skipResult.nextStep
          });
        } else {
          return NextResponse.json({
            error: skipResult.error
          }, { status: 400 });
        }

      case 'complete_onboarding':
        if (!user.organizationId) {
          return NextResponse.json({
            error: 'No organization found'
          }, { status: 400 });
        }

        const { skipOptionalSteps } = data;

        const completeResult = await OnboardingService.completeOnboarding(
          user.organizationId,
          skipOptionalSteps
        );

        if (completeResult.success) {
          return NextResponse.json({
            success: true,
            message: completeResult.message
          });
        } else {
          return NextResponse.json({
            error: completeResult.error
          }, { status: 400 });
        }

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    logger.error('Onboarding API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
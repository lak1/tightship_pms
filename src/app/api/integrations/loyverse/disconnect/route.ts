import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { LOYVERSE_CONFIG } from '@/lib/integrations/loyverse/config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { restaurantId } = await request.json();
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }
    
    const integration = await db.integrations.findUnique({
      where: {
        restaurantId_platformId: {
          restaurantId,
          platformId: 'loyverse',
        },
      },
    });
    
    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }
    
    const credentials = integration.credentials as any;
    
    if (credentials?.accessToken) {
      try {
        await fetch(LOYVERSE_CONFIG.OAUTH_ENDPOINTS.REVOKE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: credentials.accessToken,
            client_id: LOYVERSE_CONFIG.CLIENT_ID,
            client_secret: LOYVERSE_CONFIG.CLIENT_SECRET,
          }),
        });
      } catch (error) {
        console.error('Failed to revoke Loyverse token:', error);
      }
    }
    
    await db.integrations.update({
      where: {
        restaurantId_platformId: {
          restaurantId,
          platformId: 'loyverse',
        },
      },
      data: {
        status: 'DISCONNECTED',
        credentials: {},
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Loyverse integration disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Loyverse:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
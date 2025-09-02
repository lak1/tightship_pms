import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLoyverseClient } from '@/lib/integrations/loyverse/client';
import type { LoyverseMerchant, LoyverseStore } from '@/lib/integrations/loyverse/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get('restaurantId');
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }
    
    const client = await createLoyverseClient(restaurantId);
    
    if (!client) {
      return NextResponse.json(
        { error: 'Loyverse integration not connected' },
        { status: 404 }
      );
    }
    
    try {
      const [merchant, stores] = await Promise.all([
        client.get<LoyverseMerchant>('/merchant'),
        client.get<LoyverseStore[]>('/stores'),
      ]);
      
      return NextResponse.json({
        success: true,
        message: 'Loyverse integration is working',
        data: {
          merchant,
          stores,
        },
      });
    } catch (apiError: any) {
      return NextResponse.json(
        { 
          error: 'API request failed', 
          details: apiError.message 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error testing Loyverse connection:', error);
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    );
  }
}
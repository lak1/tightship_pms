import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLoyverseAuthUrl } from '@/lib/integrations/loyverse/config';
import { randomBytes } from 'crypto';

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
    
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        restaurantId,
        nonce: randomBytes(16).toString('hex'),
      })
    ).toString('base64');
    
    const authUrl = getLoyverseAuthUrl(state);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Loyverse OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
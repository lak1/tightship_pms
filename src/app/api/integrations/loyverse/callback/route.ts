import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LOYVERSE_CONFIG } from '@/lib/integrations/loyverse/config';
import type { LoyverseTokenResponse, LoyverseError } from '@/lib/integrations/loyverse/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('Loyverse OAuth error:', error);
      return NextResponse.redirect(
        `/dashboard/settings/integrations?error=${encodeURIComponent(error)}`
      );
    }
    
    if (!code || !state) {
      return NextResponse.redirect(
        '/dashboard/settings/integrations?error=missing_parameters'
      );
    }
    
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      console.error('Invalid state parameter:', e);
      return NextResponse.redirect(
        '/dashboard/settings/integrations?error=invalid_state'
      );
    }
    
    const { userId, restaurantId } = stateData;
    
    const tokenResponse = await fetch(LOYVERSE_CONFIG.OAUTH_ENDPOINTS.TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: LOYVERSE_CONFIG.CLIENT_ID,
        client_secret: LOYVERSE_CONFIG.CLIENT_SECRET,
        code,
        redirect_uri: LOYVERSE_CONFIG.REDIRECT_URI,
      }),
    });
    
    if (!tokenResponse.ok) {
      const error: LoyverseError = await tokenResponse.json();
      console.error('Token exchange failed:', error);
      return NextResponse.redirect(
        `/dashboard/settings/integrations?error=${encodeURIComponent(error.error)}`
      );
    }
    
    const tokens: LoyverseTokenResponse = await tokenResponse.json();
    
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    
    const platform = await db.platforms.findFirst({
      where: { name: 'Loyverse' },
    });
    
    if (!platform) {
      await db.platforms.create({
        data: {
          id: 'loyverse',
          name: 'Loyverse',
          isActive: true,
          config: {},
        },
      });
    }
    
    await db.integrations.upsert({
      where: {
        restaurantId_platformId: {
          restaurantId,
          platformId: 'loyverse',
        },
      },
      update: {
        credentials: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: expiresAt.toISOString(),
          scopes: tokens.scope,
        },
        status: 'CONNECTED',
        updatedAt: new Date(),
      },
      create: {
        id: `${restaurantId}_loyverse`,
        restaurantId,
        platformId: 'loyverse',
        credentials: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: expiresAt.toISOString(),
          scopes: tokens.scope,
        },
        settings: {
          syncPrices: false,
          syncInventory: false,
          syncDirection: 'FROM_LOYVERSE',
        },
        status: 'CONNECTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.redirect(
      '/dashboard/settings/integrations?success=loyverse_connected'
    );
  } catch (error) {
    console.error('Error handling Loyverse callback:', error);
    return NextResponse.redirect(
      '/dashboard/settings/integrations?error=callback_failed'
    );
  }
}
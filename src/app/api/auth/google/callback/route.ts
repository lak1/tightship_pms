import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { OAuth2Client } from 'google-auth-library'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'

function createOAuth2Client() {
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  )
}

export async function GET(request: NextRequest) {
  try {
    // Get session to verify user is authenticated
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.redirect(new URL('/auth/signin?error=unauthorized', request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      const errorMessage = searchParams.get('error_description') || error
      return NextResponse.redirect(
        new URL(`/restaurants?google_error=${encodeURIComponent(errorMessage)}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/restaurants?google_error=missing_parameters', request.url)
      )
    }

    // Parse state to get restaurant ID
    const [restaurantId, customState] = state.split(':')
    
    if (!restaurantId) {
      return NextResponse.redirect(
        new URL('/restaurants?google_error=invalid_state', request.url)
      )
    }

    // Verify restaurant belongs to user's organization
    const restaurant = await db.restaurants.findFirst({
      where: {
        id: restaurantId,
        organizationId: session.user.organizationId,
      },
    })

    if (!restaurant) {
      return NextResponse.redirect(
        new URL('/restaurants?google_error=restaurant_not_found', request.url)
      )
    }

    // Exchange code for tokens
    const oauth2Client = createOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/restaurants?google_error=token_exchange_failed', request.url)
      )
    }

    // Get user's Google Business locations to let them choose
    oauth2Client.setCredentials(tokens)
    
    let locations = []
    try {
      // Get Google My Business accounts
      const accountsResponse = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
          },
        }
      )

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        
        // For each account, get locations
        for (const account of accountsData.accounts || []) {
          try {
            const locationsResponse = await fetch(
              `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
              {
                headers: {
                  'Authorization': `Bearer ${tokens.access_token}`,
                },
              }
            )
            
            if (locationsResponse.ok) {
              const locationsData = await locationsResponse.json()
              
              for (const location of locationsData.locations || []) {
                locations.push({
                  id: location.name,
                  displayName: location.title || 
                    location.storefrontAddress?.addressLines?.[0] || 
                    'Unnamed Location',
                  address: location.storefrontAddress,
                  accountName: account.name,
                })
              }
            }
          } catch (locationError) {
            console.error(`Failed to get locations for account ${account.name}:`, locationError)
          }
        }
      }
    } catch (apiError) {
      console.error('Failed to get Google Business locations:', apiError)
    }

    // If only one location, auto-connect it
    if (locations.length === 1) {
      const location = locations[0]
      
      try {
        // Store the integration
        const integrationData = {
          restaurantId,
          googleLocationId: location.id,
          googleAccountId: location.accountName,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
          syncStatus: 'PENDING' as const,
          isActive: true,
        }

        // Check if integration already exists
        const existingIntegration = await db.google_integrations.findUnique({
          where: { restaurantId }
        })

        if (existingIntegration) {
          await db.google_integrations.update({
            where: { id: existingIntegration.id },
            data: {
              ...integrationData,
              updatedAt: new Date(),
            },
          })
        } else {
          await db.google_integrations.create({
            data: {
              id: `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              ...integrationData,
            },
          })
        }

        return NextResponse.redirect(
          new URL(`/restaurants/${restaurantId}?google_success=connected`, request.url)
        )
        
      } catch (dbError) {
        console.error('Failed to store Google integration:', dbError)
        return NextResponse.redirect(
          new URL(`/restaurants/${restaurantId}?google_error=database_error`, request.url)
        )
      }
    }

    // Multiple locations - store temporarily and redirect to selection page
    // For now, we'll just pick the first one or show an error
    if (locations.length === 0) {
      return NextResponse.redirect(
        new URL(`/restaurants/${restaurantId}?google_error=no_locations_found`, request.url)
      )
    }

    // Store the first location for simplicity (in production, you'd want location selection UI)
    const location = locations[0]
    
    try {
      const integrationData = {
        restaurantId,
        googleLocationId: location.id,
        googleAccountId: location.accountName,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
        syncStatus: 'PENDING' as const,
        isActive: true,
      }

      const existingIntegration = await db.google_integrations.findUnique({
        where: { restaurantId }
      })

      if (existingIntegration) {
        await db.google_integrations.update({
          where: { id: existingIntegration.id },
          data: {
            ...integrationData,
            updatedAt: new Date(),
          },
        })
      } else {
        await db.google_integrations.create({
          data: {
            id: `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...integrationData,
          },
        })
      }

      return NextResponse.redirect(
        new URL(`/restaurants/${restaurantId}?google_success=connected&locations=${locations.length}`, request.url)
      )
      
    } catch (dbError) {
      console.error('Failed to store Google integration:', dbError)
      return NextResponse.redirect(
        new URL(`/restaurants/${restaurantId}?google_error=database_error`, request.url)
      )
    }

  } catch (error) {
    console.error('Google OAuth callback error:', error)
    
    return NextResponse.redirect(
      new URL('/restaurants?google_error=internal_error', request.url)
    )
  }
}
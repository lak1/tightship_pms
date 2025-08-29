import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { GoogleAuth, OAuth2Client } from 'google-auth-library'

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'

// Google My Business API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'profile',
  'email'
]

// Utility functions
function createOAuth2Client() {
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  )
}

function generateGoogleAuthUrl(restaurantId: string, state?: string) {
  const oauth2Client = createOAuth2Client()
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
    scope: SCOPES,
    state: state ? `${restaurantId}:${state}` : restaurantId,
  })
}

async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client()
  
  const { tokens } = await oauth2Client.getToken(code)
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get access or refresh token')
  }
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date || Date.now() + (3600 * 1000), // 1 hour default
    tokenType: tokens.token_type || 'Bearer'
  }
}

async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  const { credentials } = await oauth2Client.refreshAccessToken()
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token')
  }
  
  return {
    accessToken: credentials.access_token,
    expiresAt: credentials.expiry_date || Date.now() + (3600 * 1000),
  }
}

// Helper to make Google My Business API calls
async function makeGoogleApiCall(
  accessToken: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'GET',
  data?: any
) {
  const baseUrl = 'https://mybusinessbusinessinformation.googleapis.com/v1'
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}/${endpoint}`
  
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google API error (${response.status}): ${errorText}`)
  }
  
  return response.json()
}

export const googleRouter = createTRPCRouter({
  // Get OAuth authorization URL
  getAuthUrl: organizationProcedure
    .input(z.object({ 
      restaurantId: z.string(),
      state: z.string().optional()
    }))
    .query(({ input }) => {
      const authUrl = generateGoogleAuthUrl(input.restaurantId, input.state)
      return { authUrl }
    }),

  // Handle OAuth callback and store tokens
  handleCallback: organizationProcedure
    .input(z.object({
      code: z.string(),
      restaurantId: z.string(),
      googleLocationId: z.string(),
      googleAccountId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify restaurant belongs to organization
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId: ctx.session.user.organizationId,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found',
        })
      }

      try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(input.code)
        
        // Check if integration already exists
        const existingIntegration = await ctx.db.google_integrations.findUnique({
          where: { restaurantId: input.restaurantId }
        })

        const integrationData = {
          restaurantId: input.restaurantId,
          googleLocationId: input.googleLocationId,
          googleAccountId: input.googleAccountId,
          accessToken: tokens.accessToken, // TODO: Encrypt in production
          refreshToken: tokens.refreshToken, // TODO: Encrypt in production
          tokenExpiresAt: new Date(tokens.expiresAt),
          syncStatus: 'PENDING' as const,
          isActive: true,
          updatedAt: new Date(),
        }

        let integration
        if (existingIntegration) {
          // Update existing integration
          integration = await ctx.db.google_integrations.update({
            where: { id: existingIntegration.id },
            data: integrationData,
          })
        } else {
          // Create new integration
          integration = await ctx.db.google_integrations.create({
            data: {
              id: `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              ...integrationData,
            },
          })
        }

        return { 
          success: true, 
          integrationId: integration.id,
          message: 'Google Business Profile connected successfully'
        }
        
      } catch (error) {
        console.error('Google OAuth callback error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to connect Google Business Profile',
          cause: error,
        })
      }
    }),

  // Get Google Business Profile integration for a restaurant
  getIntegration: organizationProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId: ctx.session.user.organizationId,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found',
        })
      }

      const integration = await ctx.db.google_integrations.findUnique({
        where: { restaurantId: input.restaurantId },
        include: {
          syncHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10, // Last 10 sync attempts
          },
        },
      })

      if (!integration) {
        return null
      }

      // Don't return sensitive tokens to frontend
      const { accessToken, refreshToken, ...safeIntegration } = integration

      return {
        ...safeIntegration,
        hasValidTokens: Boolean(accessToken && refreshToken),
        isTokenExpired: integration.tokenExpiresAt < new Date(),
      }
    }),

  // Get user's Google Business locations (for setup)
  getGoogleLocations: organizationProcedure
    .input(z.object({ accessToken: z.string() }))
    .query(async ({ input }) => {
      try {
        // First get accounts
        const accountsResponse = await makeGoogleApiCall(
          input.accessToken,
          'accounts'
        )
        
        const locations = []
        
        // For each account, get locations
        for (const account of accountsResponse.accounts || []) {
          try {
            const locationsResponse = await makeGoogleApiCall(
              input.accessToken,
              `${account.name}/locations`
            )
            
            for (const location of locationsResponse.locations || []) {
              locations.push({
                id: location.name,
                displayName: location.title || location.storefrontAddress?.addressLines?.[0] || 'Unnamed Location',
                address: location.storefrontAddress,
                accountName: account.name,
              })
            }
          } catch (error) {
            console.error(`Failed to get locations for account ${account.name}:`, error)
          }
        }
        
        return { locations }
        
      } catch (error) {
        console.error('Failed to get Google Business locations:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve Google Business locations',
          cause: error,
        })
      }
    }),

  // Disconnect Google integration
  disconnect: organizationProcedure
    .input(z.object({ restaurantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId: ctx.session.user.organizationId,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found',
        })
      }

      // Deactivate integration instead of deleting (preserve history)
      await ctx.db.google_integrations.update({
        where: { restaurantId: input.restaurantId },
        data: {
          isActive: false,
          syncStatus: 'DISCONNECTED',
          accessToken: '', // Clear tokens
          refreshToken: '',
          updatedAt: new Date(),
        },
      })

      return { success: true, message: 'Google Business Profile disconnected' }
    }),

  // Update integration settings
  updateSettings: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      autoSync: z.boolean().optional(),
      syncInterval: z.number().min(60).max(86400).optional(), // 1 minute to 1 day
    }))
    .mutation(async ({ ctx, input }) => {
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId: ctx.session.user.organizationId,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found',
        })
      }

      const updateData: any = { updatedAt: new Date() }
      if (input.autoSync !== undefined) updateData.autoSync = input.autoSync
      if (input.syncInterval !== undefined) updateData.syncInterval = input.syncInterval

      const integration = await ctx.db.google_integrations.update({
        where: { restaurantId: input.restaurantId },
        data: updateData,
      })

      return { success: true, integration: { id: integration.id } }
    }),

  // Sync menu to Google Business Profile
  syncMenu: organizationProcedure
    .input(z.object({ restaurantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const integration = await ctx.db.google_integrations.findUnique({
        where: { restaurantId: input.restaurantId }
      })

      if (!integration || !integration.isActive) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Google integration not found or inactive',
        })
      }

      // Import the sync class dynamically to avoid circular deps
      const { GoogleMenuSync } = await import('@/lib/google/menuSync')
      
      try {
        const syncEngine = new GoogleMenuSync(integration)
        const result = await syncEngine.syncMenu()
        
        if (!result.success) {
          throw new Error(result.message)
        }

        return result
        
      } catch (error) {
        console.error('Menu sync error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Menu sync failed',
          cause: error,
        })
      }
    }),

  // Get sync history
  getSyncHistory: organizationProcedure
    .input(z.object({ 
      restaurantId: z.string(),
      limit: z.number().min(1).max(100).default(10)
    }))
    .query(async ({ ctx, input }) => {
      const integration = await ctx.db.google_integrations.findUnique({
        where: { restaurantId: input.restaurantId }
      })

      if (!integration) {
        return []
      }

      const history = await ctx.db.google_sync_history.findMany({
        where: { integrationId: integration.id },
        orderBy: { createdAt: 'desc' },
        take: input.limit
      })

      return history
    }),

  // Test connection (verify tokens work)
  testConnection: organizationProcedure
    .input(z.object({ restaurantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const integration = await ctx.db.google_integrations.findUnique({
        where: { restaurantId: input.restaurantId }
      })

      if (!integration || !integration.isActive) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Google integration not found or inactive',
        })
      }

      try {
        // Try to make a simple API call to test the connection
        await makeGoogleApiCall(
          integration.accessToken,
          'accounts'
        )

        // Update last successful connection
        await ctx.db.google_integrations.update({
          where: { id: integration.id },
          data: {
            syncStatus: 'SUCCESS',
            errorMessage: null,
            updatedAt: new Date(),
          },
        })

        return { success: true, message: 'Connection test successful' }
        
      } catch (error) {
        // If token expired, try to refresh
        if (error instanceof Error && error.message.includes('401')) {
          try {
            const newTokens = await refreshAccessToken(integration.refreshToken)
            
            await ctx.db.google_integrations.update({
              where: { id: integration.id },
              data: {
                accessToken: newTokens.accessToken,
                tokenExpiresAt: new Date(newTokens.expiresAt),
                syncStatus: 'SUCCESS',
                errorMessage: null,
                updatedAt: new Date(),
              },
            })

            return { success: true, message: 'Connection test successful (token refreshed)' }
            
          } catch (refreshError) {
            await ctx.db.google_integrations.update({
              where: { id: integration.id },
              data: {
                syncStatus: 'TOKEN_EXPIRED',
                errorMessage: 'Token refresh failed',
                updatedAt: new Date(),
              },
            })

            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'Google tokens expired and refresh failed. Please reconnect.',
            })
          }
        }

        // Other errors
        await ctx.db.google_integrations.update({
          where: { id: integration.id },
          data: {
            syncStatus: 'ERROR',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Connection test failed',
          cause: error,
        })
      }
    }),
})
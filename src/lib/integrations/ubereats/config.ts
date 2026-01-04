/**
 * Uber Eats API Configuration
 *
 * Documentation: https://developer.uber.com/docs/eats
 * Authentication: OAuth 2.0 (Client Credentials + Authorization Code)
 * Supports both client secret and asymmetric key authentication
 */

export const UBEREATS_CONFIG = {
  // OAuth 2.0 endpoints
  AUTH_ENDPOINTS: {
    AUTHORIZE: 'https://auth.uber.com/oauth/v2/authorize',
    TOKEN: 'https://auth.uber.com/oauth/v2/token',
  },

  // API configuration
  API_BASE_URL: process.env.UBEREATS_API_BASE_URL || 'https://api.uber.com',
  API_VERSION: 'v2',

  // OAuth credentials (from Uber Developer Dashboard)
  CLIENT_ID: process.env.UBEREATS_CLIENT_ID || '',
  CLIENT_SECRET: process.env.UBEREATS_CLIENT_SECRET || '',

  // Asymmetric key authentication (optional - for enhanced security)
  // If provided, will use JWT-based authentication instead of client secret
  PRIVATE_KEY: process.env.UBEREATS_PRIVATE_KEY || '',
  PUBLIC_KEY: process.env.UBEREATS_PUBLIC_KEY || '',
  USE_ASYMMETRIC_AUTH: process.env.UBEREATS_USE_ASYMMETRIC_AUTH === 'true',

  // OAuth scopes
  SCOPES: {
    // Client Credentials scopes (for regular operations)
    CLIENT_CREDENTIALS: [
      'eats.store', // Update and retrieve store/menu information
      'eats.store.status.write', // Manage store availability
      'eats.order', // Accept/deny/cancel orders
      'eats.store.orders.read', // Read v2 orders
      'eats.report', // Generate transaction reports
    ],
    // Authorization Code scope (for store activation)
    AUTHORIZATION_CODE: [
      'eats.pos_provisioning', // Setup/remove POS integration; retrieve stores
    ],
  },

  // Token configuration
  TOKEN_CONFIG: {
    // Tokens are valid for 30 days (2,592,000 seconds)
    EXPIRES_IN_SECONDS: 2592000,
    // Refresh tokens 1 day before expiry
    REFRESH_BUFFER_SECONDS: 86400,
    // Rate limit: 100 token requests per hour
    MAX_TOKEN_REQUESTS_PER_HOUR: 100,
  },

  // Rate limiting
  RATE_LIMIT: {
    REQUESTS_PER_SECOND: 10, // Conservative estimate
    RETRY_AFTER_MS: 1000,
    MAX_RETRIES: 3,
  },

  // Menu sync settings
  SYNC_SETTINGS: {
    // Maximum items per batch
    MAX_ITEMS_PER_BATCH: 100,
    // Image upload size limit (MB)
    MAX_IMAGE_SIZE_MB: 5,
    // Supported image formats
    SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png'],
  },

  // Redirect URI for OAuth authorization flow
  REDIRECT_URI: process.env.UBEREATS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/ubereats/callback`,

  // Sandbox mode
  SANDBOX_MODE: process.env.UBEREATS_SANDBOX_MODE === 'true',
} as const

/**
 * Validate Uber Eats configuration
 */
export function validateUberEatsConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!UBEREATS_CONFIG.CLIENT_ID) {
    errors.push('UBEREATS_CLIENT_ID is not set')
  }

  // Check for either client secret OR asymmetric keys
  const hasClientSecret = !!UBEREATS_CONFIG.CLIENT_SECRET
  const hasAsymmetricKeys = !!UBEREATS_CONFIG.PRIVATE_KEY && !!UBEREATS_CONFIG.PUBLIC_KEY

  if (!hasClientSecret && !hasAsymmetricKeys) {
    errors.push('Either UBEREATS_CLIENT_SECRET or UBEREATS_PRIVATE_KEY/PUBLIC_KEY must be set')
  }

  if (UBEREATS_CONFIG.USE_ASYMMETRIC_AUTH && !hasAsymmetricKeys) {
    errors.push('UBEREATS_USE_ASYMMETRIC_AUTH is true but keys are not provided')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Store status values
 */
export const UBEREATS_STORE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  PAUSED: 'paused',
} as const

/**
 * Order status values
 */
export const UBEREATS_ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DENIED: 'denied',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
} as const

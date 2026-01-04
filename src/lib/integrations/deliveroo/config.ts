/**
 * Deliveroo Partner API Configuration
 *
 * Documentation: https://api-docs.deliveroo.com/docs/introduction
 * Authentication: OAuth 2.0 Client Credentials (Machine-to-Machine)
 * Sandbox: auth-sandbox.developers.deliveroo.com
 * Production: auth.developers.deliveroo.com
 */

export const DELIVEROO_CONFIG = {
  // OAuth 2.0 Client Credentials Flow
  // Note: Deliveroo uses machine-to-machine (client_credentials grant type)
  AUTH_HOST: process.env.DELIVEROO_SANDBOX_MODE === 'true'
    ? 'https://auth-sandbox.developers.deliveroo.com'
    : 'https://auth.developers.deliveroo.com',

  OAUTH_ENDPOINTS: {
    TOKEN: '/oauth2/token',
  },

  // API configuration
  // TODO: Get actual API base URL from Deliveroo docs (not specified in introduction)
  API_BASE_URL: process.env.DELIVEROO_API_BASE_URL || 'https://api.deliveroo.com',
  API_VERSION: process.env.DELIVEROO_API_VERSION || 'v1',

  // OAuth credentials (from Deliveroo Developer Portal)
  CLIENT_ID: process.env.DELIVEROO_CLIENT_ID || '',
  CLIENT_SECRET: process.env.DELIVEROO_CLIENT_SECRET || '',

  // Rate limiting
  // Note: Access tokens expire in 300 seconds (5 minutes)
  TOKEN_EXPIRY_SECONDS: 300,

  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60, // TODO: Confirm actual limit from Deliveroo
    RETRY_AFTER_MS: 1000,
    MAX_RETRIES: 3,
  },

  // Menu sync settings
  SYNC_SETTINGS: {
    // Maximum items per batch upload
    MAX_ITEMS_PER_BATCH: 100,
    // Image upload size limit (MB)
    MAX_IMAGE_SIZE_MB: 5,
    // Supported image formats
    SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  },

  // Sandbox mode (set to true for testing)
  SANDBOX_MODE: process.env.DELIVEROO_SANDBOX_MODE === 'true',
} as const

/**
 * Validate Deliveroo configuration
 */
export function validateDeliverooConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!DELIVEROO_CONFIG.CLIENT_ID) {
    errors.push('DELIVEROO_CLIENT_ID is not set')
  }

  if (!DELIVEROO_CONFIG.CLIENT_SECRET) {
    errors.push('DELIVEROO_CLIENT_SECRET is not set')
  }

  if (!DELIVEROO_CONFIG.REDIRECT_URI) {
    errors.push('DELIVEROO_REDIRECT_URI is not set')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Menu item availability settings for Deliveroo
 */
export const DELIVEROO_AVAILABILITY = {
  ALWAYS: 'always',
  SCHEDULE: 'schedule',
  OUT_OF_STOCK: 'out_of_stock',
} as const

/**
 * Menu item types supported by Deliveroo
 */
export const DELIVEROO_ITEM_TYPES = {
  PRODUCT: 'product',
  MODIFIER_GROUP: 'modifier_group',
  MODIFIER: 'modifier',
} as const

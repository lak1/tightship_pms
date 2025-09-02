export const LOYVERSE_CONFIG = {
  CLIENT_ID: process.env.LOYVERSE_CLIENT_ID!,
  CLIENT_SECRET: process.env.LOYVERSE_CLIENT_SECRET!,
  REDIRECT_URI: process.env.LOYVERSE_REDIRECT_URI || 'http://localhost:3000/api/integrations/loyverse/callback',
  
  API_BASE_URL: 'https://api.loyverse.com',
  OAUTH_BASE_URL: 'https://cloud.loyverse.com',
  
  OAUTH_ENDPOINTS: {
    AUTHORIZE: 'https://cloud.loyverse.com/oauth/authorize',
    TOKEN: 'https://api.loyverse.com/oauth/token',
    REVOKE: 'https://api.loyverse.com/oauth/revoke',
  },
  
  API_VERSION: 'v1.0',
  
  SCOPES: [
    'ITEMS_READ',
    'ITEMS_WRITE',
    'CATEGORIES_READ',
    'CATEGORIES_WRITE',
    'MODIFIERS_READ',
    'MODIFIERS_WRITE',
    'INVENTORY_READ',
    'INVENTORY_WRITE',
    'RECEIPTS_READ',
    'RECEIPTS_WRITE',
    'MERCHANT_READ',
    'STORES_READ',
  ].join(' '),
  
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    RETRY_AFTER_MS: 1000,
    MAX_RETRIES: 3,
  },
  
  WEBHOOK_EVENTS: [
    'ORDER_CREATED',
    'ITEM_UPDATED',
  ],
};

export function getLoyverseAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: LOYVERSE_CONFIG.CLIENT_ID,
    redirect_uri: LOYVERSE_CONFIG.REDIRECT_URI,
    response_type: 'code',
    scope: LOYVERSE_CONFIG.SCOPES,
    state,
  });
  
  return `${LOYVERSE_CONFIG.OAUTH_ENDPOINTS.AUTHORIZE}?${params.toString()}`;
}
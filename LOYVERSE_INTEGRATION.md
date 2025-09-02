# Loyverse Integration Setup

## Phase 1: OAuth Authentication ✅

The OAuth authentication flow for Loyverse has been implemented. Here's what's been completed:

### Completed Components

1. **Configuration** (`src/lib/integrations/loyverse/config.ts`)
   - OAuth endpoints configuration
   - API settings and rate limits
   - Scope definitions

2. **Type Definitions** (`src/lib/integrations/loyverse/types.ts`)
   - Complete TypeScript interfaces for all Loyverse API entities
   - Integration data models

3. **OAuth Flow Endpoints**
   - `/api/integrations/loyverse/auth` - Initiates OAuth flow
   - `/api/integrations/loyverse/callback` - Handles OAuth callback
   - `/api/integrations/loyverse/disconnect` - Disconnects integration
   - `/api/integrations/loyverse/test` - Tests connection

4. **API Client** (`src/lib/integrations/loyverse/client.ts`)
   - Automatic token refresh
   - Rate limiting (60 requests/minute)
   - Retry logic with exponential backoff
   - Pagination support

## Setup Instructions

### 1. Register Your App with Loyverse

1. Go to [Loyverse Developer Portal](https://developer.loyverse.com)
2. Click "Register as Developer" and login
3. Click "Add App"
4. Enter your app name
5. For Redirect URL:
   - Development: `http://localhost:3000/api/integrations/loyverse/callback`
   - Production: `https://yourdomain.com/api/integrations/loyverse/callback`
6. Save your Client ID and Client Secret

### 2. Configure Environment Variables

Add to your `.env.local` file:

```env
LOYVERSE_CLIENT_ID="your_client_id_here"
LOYVERSE_CLIENT_SECRET="your_client_secret_here"
LOYVERSE_REDIRECT_URI="http://localhost:3000/api/integrations/loyverse/callback"
```

### 3. Connect a Restaurant

To connect a restaurant to Loyverse, redirect them to:
```
/api/integrations/loyverse/auth?restaurantId={RESTAURANT_ID}
```

This will:
1. Redirect to Loyverse for authorization
2. Handle the callback and store tokens
3. Redirect back to `/dashboard/settings/integrations` with success/error status

### 4. Test the Connection

Once connected, test the integration:
```
GET /api/integrations/loyverse/test?restaurantId={RESTAURANT_ID}
```

This returns merchant and store information if successful.

## API Usage Examples

```typescript
import { createLoyverseClient } from '@/lib/integrations/loyverse/client';

// Create client
const client = await createLoyverseClient(restaurantId);

if (!client) {
  throw new Error('Loyverse not connected');
}

// Fetch items
const items = await client.paginate('/items');

// Create an item
const newItem = await client.post('/items', {
  item_name: 'Pizza Margherita',
  price: 12.99,
  category_id: 'category_123',
});

// Update an item
const updated = await client.put(`/items/${itemId}`, {
  price: 13.99,
});

// Delete an item
await client.delete(`/items/${itemId}`);
```

## Next Steps

### Phase 2: Menu Import (To be implemented)
- [ ] Create menu import wizard UI
- [ ] Implement category mapping
- [ ] Implement item mapping with modifiers
- [ ] Add conflict resolution interface
- [ ] Store mappings in database

### Phase 3: Price Sync (To be implemented)
- [ ] Create price sync settings UI
- [ ] Implement price update queue
- [ ] Add batch processing for efficiency
- [ ] Create sync status dashboard

### Phase 4: Menu Export (To be implemented)
- [ ] Implement menu export to Loyverse
- [ ] Handle validation errors
- [ ] Add progress tracking
- [ ] Implement rollback capability

## Rate Limits & Best Practices

- **Rate Limit**: 60 requests per minute
- **Automatic retry**: Built into the client
- **Token refresh**: Handled automatically
- **Pagination**: Use `client.paginate()` for large datasets

## Troubleshooting

### Common Issues

1. **"Invalid redirect_uri"**: Ensure the redirect URI in your app settings matches exactly with the one in your environment variables

2. **"Unauthorized"**: Token may have expired. The client should refresh automatically, but you can manually disconnect and reconnect if issues persist

3. **Rate limit exceeded**: The client handles this automatically with exponential backoff

4. **Connection test fails**: Check that:
   - Environment variables are set correctly
   - The restaurant has completed the OAuth flow
   - The integration status is 'CONNECTED' in the database

## Security Notes

- Tokens are stored encrypted in the database
- Refresh tokens are used to maintain long-term access
- All API requests use HTTPS
- State parameter prevents CSRF attacks during OAuth flow
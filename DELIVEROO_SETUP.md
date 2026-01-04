# Deliveroo Integration Setup Guide

Complete setup instructions for integrating Deliveroo with Tightship PMS.

## Documentation

- API Docs: https://api-docs.deliveroo.com/docs/introduction
- Developer Portal: https://developers.deliveroo.com

## Prerequisites

1. **Deliveroo Partner Account**
   - Active restaurant(s) on Deliveroo
   - Access to Deliveroo Partner Portal

2. **Developer Portal Access**
   - Create application at https://developers.deliveroo.com
   - Obtain `client_id` and `client_secret`

---

## Step 1: Create Application in Deliveroo Developer Portal

1. Log in to [Deliveroo Developer Portal](https://developers.deliveroo.com)
2. Navigate to "Applications"
3. Click "Create New Application"
4. Fill in application details:
   - **Name**: Tightship PMS
   - **Description**: Menu management and price sync
   - **Type**: Machine-to-Machine (OAuth 2.0 Client Credentials)
5. Save and note down:
   - `client_id`
   - `client_secret`
   - Restaurant ID(s)

---

## Step 2: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Deliveroo API Configuration
DELIVEROO_CLIENT_ID="your_client_id_here"
DELIVEROO_CLIENT_SECRET="your_client_secret_here"

# Sandbox mode (set to 'true' for testing, 'false' for production)
DELIVEROO_SANDBOX_MODE="true"

# Optional: Override API base URL if needed
# DELIVEROO_API_BASE_URL="https://api.deliveroo.com"
```

**Sandbox vs Production:**
- Sandbox: Uses `auth-sandbox.developers.deliveroo.com`
- Production: Uses `auth.developers.deliveroo.com`

---

## Step 3: Add Deliveroo Platform to Database

Run this SQL in your Supabase SQL editor or via Prisma:

```sql
-- Check if Deliveroo platform exists
SELECT * FROM platforms WHERE id = 'deliveroo';

-- If not exists, create it
INSERT INTO platforms (id, name, type, logo_url, settings, is_active)
VALUES (
  'deliveroo',
  'Deliveroo',
  'DELIVERY',
  'https://deliveroo.co.uk/favicon.ico',
  '{}',
  true
)
ON CONFLICT (id) DO NOTHING;
```

---

## Step 4: Connect Restaurant to Deliveroo

### Via Application UI (Future)

Navigate to:
1. Settings → Integrations
2. Click "Connect Deliveroo"
3. Enter your Deliveroo Restaurant ID
4. Click "Connect"

### Via Database (For Now)

```sql
-- Get your restaurant ID
SELECT id, name FROM restaurants WHERE organization_id = 'your_org_id';

-- Create integration record
INSERT INTO integrations (
  id,
  restaurant_id,
  platform_id,
  credentials,
  settings,
  status,
  created_at,
  updated_at
)
VALUES (
  'integration_' || gen_random_uuid()::text,
  'your_restaurant_id_here',
  'deliveroo',
  '{}'::jsonb,  -- Credentials will be auto-populated on first API call
  jsonb_build_object('deliverooRestaurantId', 'your_deliveroo_restaurant_id'),
  'CONNECTED',
  now(),
  now()
);
```

**Important:** Replace `your_deliveroo_restaurant_id` with the actual Restaurant ID from Deliveroo.

---

## Step 5: Test Connection

Use the tRPC procedure to test connectivity:

```typescript
// In your frontend code
const testConnection = trpc.deliveroo.testConnection.useMutation()

await testConnection.mutateAsync({
  restaurantId: 'your_restaurant_id'
})
```

This will:
1. Request an OAuth 2.0 access token using client credentials
2. Verify token generation succeeds
3. Return success/failure status

---

## Step 6: Upload Your First Menu

```typescript
const uploadMenu = trpc.deliveroo.uploadMenu.useMutation()

await uploadMenu.mutateAsync({
  restaurantId: 'your_restaurant_id',
  menuId: 'your_menu_id'
})
```

This will:
1. Transform your Tightship menu to Deliveroo format
2. Validate menu structure
3. Upload via Deliveroo Menu API
4. Create sync job for tracking
5. Create platform mappings for products

---

## Menu Structure Requirements

### Deliveroo Validation Rules

| Field | Constraint |
|-------|-----------|
| Menu name | 3-120 characters |
| Menu description | Max 500 characters (optimal: 200-245) |
| Category name | 3-120 characters |
| Category description | 3-255 characters |
| Item name | 2-120 characters (ideally <60) |
| Item description | Max 500 characters |
| Item price | Positive number in pence/cents |

### Images

- **Format**: JPEG or PNG
- **Dimensions**: 1920×1080 pixels
- **Aspect Ratio**: 16:9
- **Max Size**: 18 MB (cover photos)

### Allergens & Dietary Info

Supported dietary codes:
- `vegan`
- `vegetarian`
- `gluten_free`
- `dairy_free`
- `halal`

Use `no_allergens` code if item has no allergens.

---

## Managing Stock Unavailability

### Mark Items as Unavailable

```typescript
const updateUnavailabilities = trpc.deliveroo.updateUnavailabilities.useMutation()

await updateUnavailabilities.mutateAsync({
  restaurantId: 'your_restaurant_id',
  productIds: ['product_1', 'product_2'],
  makeAvailable: false  // false = unavailable, true = available
})
```

### Make Items Available Again

```typescript
await updateUnavailabilities.mutateAsync({
  restaurantId: 'your_restaurant_id',
  productIds: ['product_1', 'product_2'],
  makeAvailable: true
})
```

---

## Authentication Flow

Deliveroo uses **OAuth 2.0 Client Credentials** (machine-to-machine):

1. **Token Request:**
   ```
   POST https://auth-sandbox.developers.deliveroo.com/oauth2/token
   Content-Type: application/x-www-form-urlencoded

   client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&grant_type=client_credentials
   ```

2. **Token Response:**
   ```json
   {
     "access_token": "eyJ...",
     "expires_in": 300,
     "token_type": "Bearer",
     "scope": "..."
   }
   ```

3. **Using Token:**
   ```
   GET https://api.deliveroo.com/v1/menus/restaurant_id
   Authorization: Bearer eyJ...
   ```

**Note:** Tokens expire after 300 seconds (5 minutes). The client automatically refreshes tokens before they expire.

---

## Sync History

View sync job history:

```typescript
const syncHistory = trpc.deliveroo.getSyncHistory.useQuery({
  restaurantId: 'your_restaurant_id',
  limit: 20
})
```

Returns:
- Job ID
- Type (FULL, INCREMENTAL, PRICE_ONLY)
- Direction (PUSH, PULL, BIDIRECTIONAL)
- Status (PENDING, IN_PROGRESS, COMPLETED, FAILED)
- Progress
- Result
- Duration

---

## Troubleshooting

### Error: "Token request failed"

**Cause:** Invalid credentials or network issue

**Solution:**
1. Verify `DELIVEROO_CLIENT_ID` and `DELIVEROO_CLIENT_SECRET`
2. Check you're using sandbox credentials in sandbox mode
3. Verify Developer Portal application is active

### Error: "Deliveroo restaurant ID not configured"

**Cause:** Missing `deliverooRestaurantId` in integration settings

**Solution:**
Update integration record:
```sql
UPDATE integrations
SET settings = settings || jsonb_build_object('deliverooRestaurantId', 'YOUR_RESTAURANT_ID')
WHERE restaurant_id = 'your_restaurant_id' AND platform_id = 'deliveroo';
```

### Error: "Menu validation failed"

**Cause:** Menu doesn't meet Deliveroo's requirements

**Common Issues:**
- Category names too short (<3 chars) or too long (>120 chars)
- Empty categories (Deliveroo removes categories without items)
- Item names too short (<2 chars)
- Descriptions too long (>500 chars)

**Solution:** Fix menu data in Tightship to meet validation rules

### Error: "Failed to create Deliveroo client"

**Cause:** Integration not connected or credentials missing

**Solution:**
1. Check integration status: `SELECT * FROM integrations WHERE platform_id = 'deliveroo'`
2. Verify status is `'CONNECTED'`
3. Test connection using `testConnection` procedure

---

## Best Practices

### 1. Menu Updates

- **Update menu during off-peak hours** (3-5 AM recommended)
- **Wait for Menu Upload Result Webhook** before updating stock
- **Retrieve current unavailabilities** before PUT requests to avoid resetting stock

### 2. Stock Management

- **Use POST for individual items** (fails if items don't exist)
- **Use PUT to reset all** (makes unlisted items available)
- **Morning stock reset**: Occurs daily unless you update between midnight and opening

### 3. Rate Limiting

- Current limit: 60 requests/minute (adjust if Deliveroo provides different limits)
- Client automatically handles retries with exponential backoff
- Batch multiple changes into single requests when possible

### 4. Testing

- **Always test in sandbox first**
- Verify menu structure before production upload
- Check deliveroo.com to confirm menu appears correctly
- Test unavailability updates with test items

---

## API Endpoints (For Reference)

**Note:** Update these endpoints once confirmed from Deliveroo documentation

- Upload Menu: `PUT /v1/menus/{restaurant_id}`
- Get Menu: `GET /v1/menus/{restaurant_id}`
- Update Unavailabilities: `POST /v1/unavailabilities`
- Remove Unavailabilities: `POST /v1/unavailabilities/remove`

---

## Next Steps

1. ✅ Configure environment variables
2. ✅ Add Deliveroo platform to database
3. ✅ Create integration record for your restaurant
4. ✅ Test connection
5. ✅ Upload test menu to sandbox
6. ⏳ Verify menu on Deliveroo Partner Portal
7. ⏳ Test unavailability updates
8. ⏳ Switch to production credentials when ready
9. ⏳ Go live!

---

## Support

- **Deliveroo Support**: Contact via Partner Portal
- **API Issues**: developers@deliveroo.com (verify email from docs)
- **Tightship Issues**: File an issue in the repo

---

**Last Updated:** 2026-01-04
**Deliveroo API Version:** v1

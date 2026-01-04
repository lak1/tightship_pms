# Uber Eats Integration Setup Guide

Complete setup instructions for integrating Uber Eats with Tightship PMS.

## Documentation

- API Docs: https://developer.uber.com/docs/eats
- Menu Management: https://developer.uber.com/docs/eats/guides/menu-management
- Asymmetric Authentication: https://developer.uber.com/docs/consumer-identity/api/asymmetric_key_auth
- Developer Dashboard: https://developer.uber.com/dashboard

## Prerequisites

1. **Uber Eats Restaurant Account**
   - Active restaurant(s) on Uber Eats
   - Access to Uber Eats Manager

2. **Developer Dashboard Access**
   - Create application at https://developer.uber.com/dashboard
   - Obtain `client_id` and authentication credentials
   - Apply for Eats API access (requires approval from partner manager)

3. **Authentication Method (Choose One)**
   - **Option A**: Client Secret (simpler, less secure)
   - **Option B**: Asymmetric Keys (recommended by Uber, more secure)

---

## Step 1: Create Application in Uber Developer Dashboard

1. Log in to [Uber Developer Dashboard](https://developer.uber.com/dashboard)
2. Navigate to "Apps"
3. Click "Create New App"
4. Fill in application details:
   - **Name**: Tightship PMS
   - **Description**: Menu management and order integration
   - **Redirect URI**: `https://your-domain.com/api/integrations/ubereats/callback`
5. Select **Eats API** products
6. Request access from your Uber partner manager
7. Save and note down:
   - `client_id`
   - `client_secret` (if using Option A)

---

## Step 2: Choose Authentication Method

### Option A: Client Secret Authentication (Basic)

Simpler to set up, uses traditional OAuth 2.0 client credentials.

**Environment Variables:**
```bash
UBEREATS_CLIENT_ID="your_client_id_here"
UBEREATS_CLIENT_SECRET="your_client_secret_here"
UBEREATS_USE_ASYMMETRIC_AUTH="false"
```

### Option B: Asymmetric Key Authentication (Recommended)

More secure, uses RSA keys and JWT assertion. **Recommended by Uber for production.**

#### Generate RSA Key Pair

```bash
# Generate private key (2048-bit RSA)
openssl genrsa -out ubereats_private_key.pem 2048

# Extract public key
openssl rsa -in ubereats_private_key.pem -pubout -out ubereats_public_key.pem

# View private key (copy this to environment variable)
cat ubereats_private_key.pem

# View public key (upload this to Uber Developer Dashboard)
cat ubereats_public_key.pem
```

#### Upload Public Key to Uber

1. Go to Uber Developer Dashboard → Your App
2. Navigate to "Settings" → "Authentication"
3. Click "Add Public Key"
4. Paste your public key (`ubereats_public_key.pem` contents)
5. Note down the **Key ID** (kid) assigned by Uber
6. Save changes

**Environment Variables:**
```bash
UBEREATS_CLIENT_ID="your_client_id_here"
UBEREATS_USE_ASYMMETRIC_AUTH="true"

# Copy the entire private key including -----BEGIN/END PRIVATE KEY-----
UBEREATS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
...your private key contents...
-----END PRIVATE KEY-----"

# Public key (for reference, not required in env)
UBEREATS_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"
```

**IMPORTANT:** Keep your private key secure! Never commit it to version control.

---

## Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
# Uber Eats API Configuration
UBEREATS_CLIENT_ID="your_client_id_here"

# Authentication Method (choose one)
# Option A: Client Secret
UBEREATS_CLIENT_SECRET="your_client_secret_here"
UBEREATS_USE_ASYMMETRIC_AUTH="false"

# Option B: Asymmetric Keys (RECOMMENDED)
UBEREATS_USE_ASYMMETRIC_AUTH="true"
UBEREATS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
UBEREATS_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nYour public key here\n-----END PUBLIC KEY-----"

# OAuth Redirect URI
UBEREATS_REDIRECT_URI="https://your-domain.com/api/integrations/ubereats/callback"

# Environment
UBEREATS_SANDBOX_MODE="true"  # Set to 'false' for production

# Optional: Override API base URL
# UBEREATS_API_BASE_URL="https://api.uber.com"
```

**Note:** Use `\n` for newlines in private key when storing as single-line environment variable, or use multiline format if your .env supports it.

---

## Step 4: Add Uber Eats Platform to Database

Run this SQL in your Supabase SQL editor:

```sql
-- Check if Uber Eats platform exists
SELECT * FROM platforms WHERE id = 'ubereats';

-- If not exists, create it
INSERT INTO platforms (id, name, type, logo_url, settings, is_active)
VALUES (
  'ubereats',
  'Uber Eats',
  'DELIVERY',
  'https://d3i4yxtzktqr9n.cloudfront.net/web-eats-v2/favicon.ico',
  '{}',
  true
)
ON CONFLICT (id) DO NOTHING;
```

---

## Step 5: Store Activation (Authorization Code Flow)

Before you can push menus, you need to activate your restaurant(s) with Uber Eats using the Authorization Code flow.

### Authorization URL

Direct restaurant owners to this URL (replace placeholders):

```
https://auth.uber.com/oauth/v2/authorize?
  client_id=YOUR_CLIENT_ID
  &response_type=code
  &redirect_uri=YOUR_REDIRECT_URI
  &scope=eats.pos_provisioning
  &state=RANDOM_STATE_STRING
```

### Callback Handler

Create endpoint at `/api/integrations/ubereats/callback` to handle the authorization code:

```typescript
// Exchange code for access token
POST https://auth.uber.com/oauth/v2/token
Content-Type: application/x-www-form-urlencoded

code=AUTHORIZATION_CODE
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&grant_type=authorization_code
&redirect_uri=YOUR_REDIRECT_URI
```

### Retrieve Store IDs

After authorization, fetch the store IDs:

```typescript
GET https://api.uber.com/v2/eats/stores
Authorization: Bearer ACCESS_TOKEN
```

Store the `store_id` in integration settings for each restaurant.

---

## Step 6: Connect Restaurant to Uber Eats

### Via Database

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
  'ubereats',
  '{}'::jsonb,  -- Credentials auto-populated on first API call
  jsonb_build_object(
    'uberEatsStoreId', 'your_uber_eats_store_id',
    'keyId', 'your_key_id_from_uber'  -- Only if using asymmetric auth
  ),
  'CONNECTED',
  now(),
  now()
);
```

**Important Fields:**
- `uberEatsStoreId`: The store ID from Uber Eats (obtained in Step 5)
- `keyId`: The Key ID (kid) from Uber Developer Dashboard (only for asymmetric auth)

---

## Step 7: Test Connection

Use the tRPC procedure to verify setup:

```typescript
// In your frontend code
const testConnection = trpc.uberEats.testConnection.useMutation()

await testConnection.mutateAsync({
  restaurantId: 'your_restaurant_id'
})
```

This will:
1. Generate JWT assertion (if using asymmetric auth) or use client secret
2. Request OAuth 2.0 access token
3. Optionally fetch store details to verify access
4. Return success/failure status

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully connected to Uber Eats API",
  "storeInfo": {
    "id": "store_123",
    "name": "Your Restaurant Name",
    "status": "online"
  }
}
```

---

## Step 8: Upload Your First Menu

```typescript
const upsertMenu = trpc.uberEats.upsertMenu.useMutation()

await upsertMenu.mutateAsync({
  restaurantId: 'your_restaurant_id',
  menuId: 'your_menu_id',
  languageCode: 'en'  // Optional: default is 'en'
})
```

This will:
1. Transform your Tightship menu to Uber Eats format
2. Validate menu structure
3. Upload via Uber Eats Menu API (`PUT /v2/eats/stores/{store_id}/menus`)
4. Create sync job for tracking
5. Update integration last sync time

**Menu Structure Uploaded:**
- Menus → Categories → Items
- Translations for all text fields
- Prices in cents (automatically converted from decimal)
- Images, dietary info, nutritional info
- Modifier groups (if configured)

---

## Authentication Flow Details

### Client Credentials Flow (Both Methods)

**Option A - Client Secret:**
```
POST https://auth.uber.com/oauth/v2/token
Content-Type: application/x-www-form-urlencoded

client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&grant_type=client_credentials
&scope=eats.store eats.store.status.write eats.order eats.store.orders.read eats.report
```

**Option B - Asymmetric Keys (JWT Assertion):**

1. **Generate JWT Assertion:**
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "your_key_id_from_uber"
  },
  "payload": {
    "iss": "YOUR_CLIENT_ID",
    "sub": "YOUR_CLIENT_ID",
    "aud": "auth.uber.com",
    "jti": "unique_id_for_this_request",  // MUST be unique every time
    "exp": 1234567890  // Current time + 1 hour
  }
}
```

2. **Sign with Private Key (RS256)** → Get JWT token

3. **Request Access Token:**
```
POST https://auth.uber.com/oauth/v2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&scope=eats.store eats.store.status.write eats.order eats.store.orders.read eats.report
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion=YOUR_JWT_ASSERTION
```

### Token Response

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 2592000,  // 30 days
  "scope": "eats.store eats.store.status.write...",
  "refresh_token": "..."  // Optional
}
```

**Important:** Tokens are valid for **30 days** (vs Deliveroo's 5 minutes). The client automatically refreshes tokens 1 day before expiry.

---

## Menu Structure Requirements

### Uber Eats Validation Rules

| Field | Constraint |
|-------|-----------|
| Menu section title | Required, with translations |
| Category title | Required, with translations |
| Category must have items | At least 1 item required |
| Item title | Required, with translations |
| Item price | Required, in cents (positive integer) |
| Image URL | Optional, must be valid URL |

### Supported Languages

Provide translations in `translations` object:
```json
{
  "title": {
    "translations": {
      "en": "Burger",
      "es": "Hamburguesa",
      "fr": "Hamburger"
    }
  }
}
```

**Default:** `en` (English)

### Dietary Labels

Supported classifications:
- `VEGAN`
- `VEGETARIAN`
- `GLUTEN_FREE`
- `HALAL`

Automatically mapped from Tightship dietary info.

### Nutritional Info

Calories are automatically included if available:
```json
{
  "nutritional_info": {
    "calories": {
      "display_value": "350 cal",
      "energy_value": 350
    }
  }
}
```

---

## Managing Item Availability

### Suspend Items (Out of Stock)

```typescript
const updateAvailability = trpc.uberEats.updateItemAvailability.useMutation()

await updateAvailability.mutateAsync({
  restaurantId: 'your_restaurant_id',
  productIds: ['product_1', 'product_2'],
  suspended: true,
  reason: 'OUT_OF_STOCK',  // Optional
  suspendUntil: new Date('2026-01-05T18:00:00Z')  // Optional: auto-unsuspend time
})
```

### Make Items Available Again

```typescript
await updateAvailability.mutateAsync({
  restaurantId: 'your_restaurant_id',
  productIds: ['product_1', 'product_2'],
  suspended: false
})
```

**Note:** Requires platform mappings to exist (created during first menu upload).

---

## Store Status Management

Control your restaurant's online status:

```typescript
const updateStatus = trpc.uberEats.updateStoreStatus.useMutation()

await updateStatus.mutateAsync({
  restaurantId: 'your_restaurant_id',
  status: 'online'  // 'online', 'offline', or 'paused'
})
```

**Status Values:**
- `online`: Accepting orders
- `offline`: Not accepting orders
- `paused`: Temporarily paused

---

## Sync History

View sync job history:

```typescript
const syncHistory = trpc.uberEats.getSyncHistory.useQuery({
  restaurantId: 'your_restaurant_id',
  limit: 20
})
```

Returns:
- Job ID
- Type (FULL, INCREMENTAL, etc.)
- Direction (PUSH, PULL, BIDIRECTIONAL)
- Status (PENDING, IN_PROGRESS, COMPLETED, FAILED)
- Progress
- Result (categories/items uploaded, errors)
- Duration

---

## Troubleshooting

### Error: "JWT generation failed"

**Cause:** Invalid private key format or algorithm mismatch

**Solution:**
1. Verify private key is in PKCS#8 format (starts with `-----BEGIN PRIVATE KEY-----`)
2. If you have PKCS#1 format (`-----BEGIN RSA PRIVATE KEY-----`), convert it:
   ```bash
   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
     -in rsa_private_key.pem -out private_key.pem
   ```
3. Ensure no extra whitespace or line breaks in environment variable
4. Verify key ID matches the one in Uber Developer Dashboard

### Error: "Token request failed: Invalid assertion"

**Cause:** JWT assertion doesn't meet Uber's requirements

**Common Issues:**
- `jti` (JWT ID) is not unique (must be unique for every request)
- `iss` and `sub` don't match client ID
- `aud` is not `auth.uber.com`
- `exp` is in the past or too far in the future
- `kid` doesn't match key ID in Uber Developer Dashboard

**Solution:** Check JWT payload structure and ensure all fields are correct.

### Error: "Uber Eats store ID not configured"

**Cause:** Missing `uberEatsStoreId` in integration settings

**Solution:**
```sql
UPDATE integrations
SET settings = settings || jsonb_build_object('uberEatsStoreId', 'YOUR_STORE_ID')
WHERE restaurant_id = 'your_restaurant_id' AND platform_id = 'ubereats';
```

### Error: "Menu validation failed"

**Cause:** Menu doesn't meet Uber Eats requirements

**Common Issues:**
- Menu section has no categories
- Category has no items
- Missing title translations
- Items without prices

**Solution:** Check validation errors in response and fix menu structure in Tightship.

### Error: "Authentication failed after token refresh"

**Cause:** Credentials are invalid or revoked

**Solution:**
1. Verify credentials in Uber Developer Dashboard
2. Check if app has been approved for Eats API access
3. For asymmetric auth: verify public key is uploaded correctly
4. Test with `testConnection` procedure

---

## Rate Limiting

**Token Requests:**
- Limit: 100 requests per hour
- Auto-refresh: 1 day before expiry to minimize token requests

**API Requests:**
- Estimated: ~10 requests per second (conservative)
- Client implements automatic retry with exponential backoff
- Rate limit status: Check `Retry-After` header in 429 responses

---

## Best Practices

### 1. Menu Updates

- **Update during off-peak hours** (early morning recommended)
- **Test in sandbox first** before production uploads
- **Validate menu structure** before upload using `validateUberEatsMenu()`
- **Monitor sync jobs** to track success/failure

### 2. Stock Management

- **Use item availability API** instead of re-uploading entire menu
- **Set suspend_until** for temporary unavailability
- **Create platform mappings** on first menu upload
- **Batch updates** when possible (multiple items in one request)

### 3. Security

- **Use asymmetric keys** for production (more secure than client secret)
- **Rotate keys regularly** (every 90 days recommended)
- **Never commit private keys** to version control
- **Use environment variables** for all credentials
- **Monitor token usage** to detect unauthorized access

### 4. Testing

- **Always test in sandbox first**
- Use `testConnection` to verify setup
- Upload test menu before production
- Verify menu appears correctly in Uber Eats Manager
- Test all item availability states

---

## OAuth Scopes Reference

### Client Credentials Scopes (Regular Operations)

- `eats.store`: Update and retrieve store/menu information
- `eats.store.status.write`: Manage store availability (online/offline)
- `eats.order`: Accept/deny/cancel orders
- `eats.store.orders.read`: Read v2 orders
- `eats.report`: Generate transaction reports

### Authorization Code Scope (Store Activation)

- `eats.pos_provisioning`: Setup/remove POS integration; retrieve stores

---

## API Endpoints Reference

Base URL: `https://api.uber.com`

### Menu Management
- Upload Menu: `PUT /v2/eats/stores/{store_id}/menus`
- Get Menu: `GET /v2/eats/stores/{store_id}/menus`
- Update Item: `POST /v2/eats/stores/{store_id}/menus/items/{item_id}`

### Store Management
- Get Store: `GET /v2/eats/stores/{store_id}`
- Update Status: `PATCH /v2/eats/stores/{store_id}/status`
- List Stores: `GET /v2/eats/stores` (with pos_provisioning scope)

### Orders (Future)
- List Orders: `GET /v2/eats/stores/{store_id}/orders`
- Get Order: `GET /v2/eats/stores/{store_id}/orders/{order_id}`
- Accept Order: `POST /v2/eats/stores/{store_id}/orders/{order_id}/accept_pos_order`
- Deny Order: `POST /v2/eats/stores/{store_id}/orders/{order_id}/deny_pos_order`

---

## Next Steps

1. ✅ Configure environment variables
2. ✅ Generate RSA keys (if using asymmetric auth)
3. ✅ Upload public key to Uber Developer Dashboard
4. ✅ Add Uber Eats platform to database
5. ⏳ Complete store activation (authorization code flow)
6. ⏳ Create integration record with store ID
7. ⏳ Test connection
8. ⏳ Upload test menu to sandbox
9. ⏳ Verify menu in Uber Eats Manager
10. ⏳ Test item availability updates
11. ⏳ Switch to production credentials
12. ⏳ Go live!

---

## Support

- **Uber Eats API Support**: Contact your partner manager
- **Developer Forums**: https://developer.uber.com/community
- **Documentation**: https://developer.uber.com/docs/eats
- **Tightship Issues**: File an issue in the repo

---

**Last Updated:** 2026-01-04
**Uber Eats API Version:** v2
**Authentication:** OAuth 2.0 Client Credentials + Asymmetric Keys

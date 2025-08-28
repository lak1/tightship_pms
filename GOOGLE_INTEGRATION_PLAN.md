# Google Business Profile Integration Implementation Plan

## 1. Database Schema Extensions

Add new tables to store Google Business Profile integration data:

### New Tables Needed:

```sql
-- Store Google OAuth tokens per restaurant
CREATE TABLE google_integrations (
  id VARCHAR PRIMARY KEY,
  restaurantId VARCHAR NOT NULL REFERENCES restaurants(id),
  googleLocationId VARCHAR NOT NULL, -- Google My Business location ID
  accessToken TEXT NOT NULL,
  refreshToken TEXT NOT NULL,
  tokenExpiresAt TIMESTAMP NOT NULL,
  isActive BOOLEAN DEFAULT true,
  lastSyncAt TIMESTAMP,
  syncStatus VARCHAR DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'error'
  errorMessage TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Track sync history
CREATE TABLE google_sync_history (
  id VARCHAR PRIMARY KEY,
  integrationId VARCHAR NOT NULL REFERENCES google_integrations(id),
  syncType VARCHAR NOT NULL, -- 'menu', 'photos', 'all'
  status VARCHAR NOT NULL, -- 'success', 'error', 'partial'
  itemsSynced INTEGER DEFAULT 0,
  errorDetails TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Map menu items to Google menu structure
CREATE TABLE google_menu_mappings (
  id VARCHAR PRIMARY KEY,
  productId VARCHAR NOT NULL REFERENCES products(id),
  integrationId VARCHAR NOT NULL REFERENCES google_integrations(id),
  googleMenuSectionId VARCHAR, -- Maps to Google's section structure
  displayOrder INTEGER DEFAULT 0,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## 2. Authentication Flow Implementation

### OAuth 2.0 Setup Process:

1. **Google Cloud Console Setup**:
   - Create project in Google Cloud Console
   - Enable Google My Business API
   - Create OAuth 2.0 credentials
   - Configure consent screen

2. **Backend OAuth Handler**:
```typescript
// src/server/routers/google.ts
export const googleRouter = createTRPCRouter({
  // Initiate OAuth flow
  getAuthUrl: protectedProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(({ input }) => {
      const authUrl = generateGoogleAuthUrl(input.restaurantId);
      return { authUrl };
    }),

  // Handle OAuth callback
  handleCallback: protectedProcedure
    .input(z.object({
      code: z.string(),
      restaurantId: z.string(),
      locationId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const tokens = await exchangeCodeForTokens(input.code);
      
      // Store integration
      await ctx.db.google_integrations.create({
        data: {
          id: generateId(),
          restaurantId: input.restaurantId,
          googleLocationId: input.locationId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: new Date(tokens.expiresAt),
        }
      });
    })
});
```

## 3. Menu Sync Engine

### Core Sync Logic:

```typescript
// src/lib/google/menuSync.ts
export class GoogleMenuSync {
  private integration: GoogleIntegration;
  
  constructor(integration: GoogleIntegration) {
    this.integration = integration;
  }

  async syncMenu(): Promise<SyncResult> {
    try {
      // 1. Get current menu from TightShip
      const restaurant = await this.getRestaurantWithMenu();
      
      // 2. Transform to Google format
      const googleMenu = await this.transformToGoogleFormat(restaurant);
      
      // 3. Get current Google menu
      const currentGoogleMenu = await this.getCurrentGoogleMenu();
      
      // 4. Calculate differences
      const changes = this.calculateMenuDiff(currentGoogleMenu, googleMenu);
      
      // 5. Apply changes via Google API
      if (changes.hasChanges) {
        await this.updateGoogleMenu(googleMenu);
        await this.updateSyncHistory('success', changes.itemCount);
      }
      
      return { success: true, changes };
      
    } catch (error) {
      await this.updateSyncHistory('error', 0, error.message);
      throw error;
    }
  }

  private async transformToGoogleFormat(restaurant: Restaurant) {
    const menuSections = restaurant.menus.flatMap(menu => 
      menu.categories.map(category => ({
        labels: { displayName: category.name },
        items: category.products.map(product => ({
          labels: { displayName: product.name },
          description: product.description,
          price: {
            currencyCode: 'GBP',
            units: Math.floor(parseFloat(product.basePrice)),
            nanos: (parseFloat(product.basePrice) % 1) * 1000000000
          },
          attributes: {
            allergens: product.allergens,
            dietaryRestrictions: product.dietaryInfo,
            spiciness: this.mapSpiciness(product.spiciness),
          }
        }))
      }))
    );

    return {
      menus: [{
        cuisines: this.mapCuisineTypes(restaurant.cuisineType),
        sections: menuSections
      }]
    };
  }

  private async updateGoogleMenu(menuData: GoogleMenuData) {
    const response = await this.googleApiCall(
      'POST',
      `accounts/${this.integration.accountId}/locations/${this.integration.googleLocationId}/foodMenus`,
      menuData
    );
    
    return response;
  }
}
```

## 4. User Interface Components

### Restaurant Settings Integration Tab:

```typescript
// src/components/integrations/GoogleIntegration.tsx
export function GoogleIntegrationSettings({ restaurantId }: Props) {
  const { data: integration } = trpc.google.getIntegration.useQuery({ restaurantId });
  const connectMutation = trpc.google.getAuthUrl.useMutation();
  const syncMutation = trpc.google.syncMenu.useMutation();

  const handleConnect = async () => {
    const { authUrl } = await connectMutation.mutateAsync({ restaurantId });
    window.open(authUrl, 'google-auth', 'width=600,height=600');
  };

  const handleSync = async () => {
    await syncMutation.mutateAsync({ restaurantId });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Google Business Profile</h3>
        <GoogleIcon className="h-8 w-8" />
      </div>

      {!integration ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            Connect your Google Business Profile to automatically sync menu updates
          </p>
          <button
            onClick={handleConnect}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Connect Google Account
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Connected to Google</p>
              <p className="text-sm text-gray-500">
                Location: {integration.googleLocationName}
              </p>
              <p className="text-sm text-gray-500">
                Last sync: {integration.lastSyncAt 
                  ? new Date(integration.lastSyncAt).toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSync}
                disabled={syncMutation.isLoading}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {syncMutation.isLoading ? 'Syncing...' : 'Sync Now'}
              </button>
              <button className="text-red-600 text-sm hover:text-red-800">
                Disconnect
              </button>
            </div>
          </div>

          {/* Sync Status */}
          <SyncStatus integration={integration} />
          
          {/* Auto-sync Settings */}
          <AutoSyncSettings restaurantId={restaurantId} />
        </div>
      )}
    </div>
  );
}
```

## 5. Automatic Sync Triggers

### Product Update Hooks:

```typescript
// src/server/routers/product.ts - Add to existing update mutation
const updateProductMutation = {
  // ... existing code
  
  async mutation({ ctx, input }) {
    // Update product in database
    const product = await ctx.db.products.update(/* ... */);
    
    // Trigger Google sync if integration exists
    const googleIntegration = await ctx.db.google_integrations.findFirst({
      where: {
        restaurants: { id: product.menuId },
        isActive: true
      }
    });
    
    if (googleIntegration) {
      // Queue sync job (background processing)
      await queueGoogleMenuSync(googleIntegration.id, 'product_update');
    }
    
    return product;
  }
}
```

## 6. Background Job Processing

### Queue-based Sync Jobs:

```typescript
// src/lib/jobs/googleSync.ts
export async function processGoogleSyncJob(integrationId: string) {
  const integration = await db.google_integrations.findUnique({
    where: { id: integrationId }
  });
  
  if (!integration || !integration.isActive) {
    return;
  }
  
  const syncEngine = new GoogleMenuSync(integration);
  
  try {
    await syncEngine.syncMenu();
  } catch (error) {
    console.error('Google sync failed:', error);
    
    // Update integration status
    await db.google_integrations.update({
      where: { id: integrationId },
      data: {
        syncStatus: 'error',
        errorMessage: error.message,
        updatedAt: new Date()
      }
    });
  }
}
```

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema migration
- [ ] Google OAuth setup and authentication flow
- [ ] Basic integration UI

### Phase 2: Core Sync (Week 3-4)
- [ ] Menu transformation logic
- [ ] Google API integration
- [ ] Manual sync functionality

### Phase 3: Automation (Week 5-6)
- [ ] Automatic sync triggers
- [ ] Background job processing
- [ ] Error handling and retry logic

### Phase 4: Polish (Week 7-8)
- [ ] Sync history and logging
- [ ] Advanced settings (auto-sync intervals)
- [ ] Photo sync capabilities
- [ ] Comprehensive error handling

## 8. Value Proposition for Customers

### "Set It and Forget It" Menu Updates:
✅ **Price changes** → Auto-update Google Maps
✅ **New items** → Appear on Google Business Profile
✅ **Seasonal menus** → Sync automatically
✅ **Out-of-stock** → Can be hidden from Google
✅ **Allergen updates** → Push to Google instantly

### Customer Benefits:
- **Save time**: No manual Google My Business updates
- **Stay current**: Google always shows latest menu
- **Attract customers**: Fresh, accurate listings
- **Competitive advantage**: Most competitors update manually
- **SEO benefits**: Rich, structured menu data

## 9. Technical Considerations

### Rate Limits & Quotas:
- Google My Business API has rate limits
- Implement exponential backoff
- Queue and batch updates when possible

### Error Handling:
- Token expiration (refresh tokens)
- Network failures (retry logic)
- Invalid menu data (validation)
- Google API changes (graceful degradation)

### Security:
- Encrypt stored tokens
- Secure OAuth callback handling
- Validate all Google API responses
- Audit trail for all sync operations

## 10. Pricing Strategy

### Potential Pricing Tiers:
- **Basic Plan**: Manual sync only
- **Pro Plan**: Auto-sync + unlimited manual syncs
- **Enterprise**: Multiple locations + advanced features

This Google Business Profile integration would be a **major differentiator** for TightShip PMS!
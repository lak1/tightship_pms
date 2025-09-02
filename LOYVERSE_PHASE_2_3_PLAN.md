# Loyverse Integration - Phase 2 & 3 Implementation Plan

## Phase 2: Menu Import from Loyverse

### Overview
Import menu items, categories, and modifiers from Loyverse into your system. This will be a one-time import with optional re-sync capability.

### Implementation Tasks

#### 2.1 Database Schema Updates
```sql
-- Add mapping tables
CREATE TABLE loyverse_item_mappings (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  our_item_id UUID REFERENCES products(id),
  loyverse_item_id VARCHAR(255),
  loyverse_variant_id VARCHAR(255),
  last_synced_at TIMESTAMP,
  sync_direction VARCHAR(50), -- 'TO_LOYVERSE', 'FROM_LOYVERSE', 'BIDIRECTIONAL'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE loyverse_sync_logs (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  sync_type VARCHAR(50),
  status VARCHAR(50), -- 'SUCCESS', 'FAILED', 'PARTIAL'
  items_processed INTEGER,
  items_failed INTEGER,
  error_details JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

#### 2.2 Menu Import Service (`src/lib/integrations/loyverse/services/menuImport.ts`)
```typescript
class MenuImportService {
  // Fetch all menu data from Loyverse
  async fetchLoyverseMenu(restaurantId: string) {
    - Fetch all categories
    - Fetch all items with pagination
    - Fetch all modifier lists
    - Fetch inventory levels (optional)
    - Return structured data
  }
  
  // Transform Loyverse data to your schema
  async transformMenuData(loyverseData: any) {
    - Map categories to your structure
    - Map items with proper category relationships
    - Handle modifiers and variants
    - Calculate pricing with tax considerations
  }
  
  // Import with conflict resolution
  async importMenu(restaurantId: string, options: ImportOptions) {
    - Check for existing items (by name or SKU)
    - Apply conflict resolution strategy
    - Create/update categories
    - Create/update items
    - Store mappings for future syncs
    - Log import results
  }
}
```

#### 2.3 Import Wizard UI Components

##### Component Structure:
```
/src/components/integrations/loyverse/
  ├── ImportWizard.tsx          // Main wizard container
  ├── steps/
  │   ├── SelectItems.tsx       // Choose what to import
  │   ├── ConflictResolution.tsx // Handle duplicates
  │   ├── FieldMapping.tsx      // Map fields if needed
  │   └── ImportSummary.tsx     // Review before import
  ├── ItemPreview.tsx           // Preview Loyverse items
  └── ImportProgress.tsx        // Show import progress
```

##### Import Wizard Flow:
1. **Fetch & Display**: Show Loyverse menu structure
2. **Selection**: Let user choose categories/items to import
3. **Conflict Detection**: Identify existing items with same name/SKU
4. **Resolution Options**:
   - Skip existing items
   - Update existing items
   - Create duplicates with suffix
   - Manual selection per item
5. **Field Mapping**: Map Loyverse fields to your fields
6. **Import Execution**: Process with progress indicator
7. **Results Summary**: Show success/failure counts

#### 2.4 API Endpoints

```typescript
// GET /api/integrations/loyverse/menu/preview
// Fetches and returns Loyverse menu for preview

// POST /api/integrations/loyverse/menu/import
// Executes the import with selected options
{
  restaurantId: string;
  selectedCategories: string[];
  selectedItems: string[];
  conflictResolution: 'skip' | 'update' | 'duplicate';
  fieldMappings?: Record<string, string>;
}

// GET /api/integrations/loyverse/menu/status
// Returns current import status/progress
```

### Considerations for Phase 2

1. **Data Validation**
   - Validate required fields
   - Handle missing categories
   - Validate price formats
   - Check modifier relationships

2. **Performance**
   - Batch database operations
   - Use transactions for consistency
   - Implement progress streaming
   - Add request timeout handling

3. **Error Handling**
   - Partial import recovery
   - Detailed error logging
   - User-friendly error messages
   - Rollback capability

4. **Two-Way Sync Challenges**
   - No timestamps in Loyverse API
   - Manual conflict resolution required
   - Consider "last write wins" with user override
   - Store sync history for audit

---

## Phase 3: Price Sync to Loyverse

### Overview
Automatically sync price changes from your system to Loyverse. This will be a one-way sync with queuing and batch processing.

### Implementation Tasks

#### 3.1 Price Sync Service (`src/lib/integrations/loyverse/services/priceSync.ts`)

```typescript
class PriceSyncService {
  // Queue price updates
  async queuePriceUpdate(itemId: string, newPrice: number) {
    - Add to sync queue (Redis or database)
    - Group by restaurant
    - Mark for next sync batch
  }
  
  // Process sync queue
  async processSyncQueue(restaurantId: string) {
    - Fetch pending price updates
    - Batch updates (respect rate limits)
    - Update Loyverse items
    - Handle failures with retry
    - Update sync status
  }
  
  // Scheduled sync job
  async scheduledSync() {
    - Run every X minutes
    - Process all restaurants with pending updates
    - Respect rate limits across restaurants
    - Send notifications on failures
  }
}
```

#### 3.2 Database Schema for Sync Queue

```sql
CREATE TABLE loyverse_price_sync_queue (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  item_mapping_id UUID REFERENCES loyverse_item_mappings(id),
  our_item_id UUID REFERENCES products(id),
  loyverse_item_id VARCHAR(255),
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  status VARCHAR(50), -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_sync_queue_status ON loyverse_price_sync_queue(status, restaurant_id);
```

#### 3.3 Webhook/Trigger Integration

```typescript
// Listen for price changes in your system
// Option 1: Database trigger
CREATE TRIGGER on_price_update
  AFTER UPDATE ON products
  WHEN OLD.price != NEW.price
  EXECUTE FUNCTION queue_loyverse_price_sync();

// Option 2: Application-level hook
prisma.$use(async (params, next) => {
  if (params.model === 'Product' && params.action === 'update') {
    if (params.args.data.price !== undefined) {
      await queueLoyversePriceSync(params.args.where.id);
    }
  }
  return next(params);
});
```

#### 3.4 Sync Settings UI

```typescript
// Component: /src/components/integrations/loyverse/PriceSyncSettings.tsx
interface PriceSyncSettings {
  enabled: boolean;
  syncDirection: 'TO_LOYVERSE' | 'FROM_LOYVERSE' | 'BIDIRECTIONAL';
  syncFrequency: 'REALTIME' | 'BATCH_5MIN' | 'BATCH_HOURLY' | 'MANUAL';
  includeCategories: string[];
  excludeCategories: string[];
  priceRoundingRule: 'NONE' | 'NEAREST_0.05' | 'NEAREST_0.10' | 'UP' | 'DOWN';
  notifyOnError: boolean;
  notificationEmail?: string;
}
```

#### 3.5 Sync Dashboard

```typescript
// Component: /src/components/integrations/loyverse/SyncDashboard.tsx
- Current sync status
- Queue size and processing rate
- Recent sync history
- Failed items with retry option
- Sync statistics (items synced, success rate)
- Manual sync trigger button
```

#### 3.6 API Endpoints

```typescript
// GET /api/integrations/loyverse/sync/status
// Returns current sync queue status and statistics

// POST /api/integrations/loyverse/sync/trigger
// Manually trigger sync for a restaurant

// GET /api/integrations/loyverse/sync/history
// Returns sync history with pagination

// POST /api/integrations/loyverse/sync/retry
// Retry failed sync items

// PUT /api/integrations/loyverse/sync/settings
// Update sync settings for a restaurant
```

### Implementation Approach for Phase 3

1. **Queue Management**
   ```typescript
   class SyncQueue {
     - Use Redis for real-time updates
     - Or database table for simpler setup
     - Implement priority queuing
     - Handle duplicate updates (coalesce)
   }
   ```

2. **Rate Limit Management**
   ```typescript
   class RateLimitManager {
     - Track requests per restaurant
     - Implement token bucket algorithm
     - Share limit across multiple restaurants
     - Pause/resume based on limits
   }
   ```

3. **Error Recovery**
   ```typescript
   class ErrorRecovery {
     - Exponential backoff for retries
     - Maximum retry attempts
     - Dead letter queue for failed items
     - Admin notification system
   }
   ```

4. **Monitoring & Alerts**
   - Track sync performance metrics
   - Alert on high failure rates
   - Monitor queue depth
   - Track API response times

### Batch Processing Strategy

```typescript
async function processBatch(restaurantId: string) {
  const batchSize = 10; // Adjust based on rate limits
  const items = await fetchPendingItems(restaurantId, batchSize);
  
  const results = await Promise.allSettled(
    items.map(item => updateLoyversePrice(item))
  );
  
  // Process results
  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      await markAsCompleted(items[index].id);
    } else {
      await markAsFailed(items[index].id, result.reason);
    }
  }
}
```

---

## Additional Considerations for Both Phases

### Testing Strategy
1. **Unit Tests**: Test transformation logic
2. **Integration Tests**: Test API client with mocked responses
3. **E2E Tests**: Test full flow with test Loyverse account
4. **Load Testing**: Ensure system handles large menus

### Performance Optimization
1. **Caching**: Cache Loyverse menu data for preview
2. **Pagination**: Handle large datasets efficiently
3. **Background Jobs**: Use job queue for long-running tasks
4. **Database Indexes**: Optimize mapping lookups

### User Experience
1. **Progress Indicators**: Show real-time import/sync progress
2. **Error Messages**: Clear, actionable error messages
3. **Undo Capability**: Allow reverting recent imports
4. **Audit Trail**: Log all sync activities

### Security
1. **Token Security**: Encrypt tokens at rest
2. **Input Validation**: Validate all data from Loyverse
3. **Rate Limiting**: Implement client-side rate limiting
4. **Access Control**: Ensure proper authorization

### Monitoring & Maintenance
1. **Health Checks**: Monitor integration health
2. **Metrics**: Track sync success rates
3. **Alerting**: Notify on integration failures
4. **Logs**: Comprehensive logging for debugging

---

## Timeline Estimate

### Phase 2: Menu Import (1-2 weeks)
- Week 1: Backend implementation (API, services, database)
- Week 2: Frontend UI and testing

### Phase 3: Price Sync (1 week)
- Days 1-2: Queue system and sync service
- Days 3-4: UI components and settings
- Days 5: Testing and optimization

### Total: 2-3 weeks for both phases

---

## Quick Start Commands When Ready

When you're ready to implement Phase 2 & 3, start with:

```bash
# Phase 2: Create menu import service
touch src/lib/integrations/loyverse/services/menuImport.ts
touch src/lib/integrations/loyverse/services/menuTransform.ts

# Phase 3: Create price sync service  
touch src/lib/integrations/loyverse/services/priceSync.ts
touch src/lib/integrations/loyverse/services/syncQueue.ts

# Create UI components
mkdir -p src/components/integrations/loyverse
touch src/components/integrations/loyverse/ImportWizard.tsx
touch src/components/integrations/loyverse/SyncDashboard.tsx
```

This plan provides a complete roadmap for implementing menu import and price sync functionality when you're ready to proceed.
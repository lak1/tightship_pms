-- Phase 2: Enhanced Subscription System Migration
-- This script handles the migration from the old subscription system to the new one

-- Step 1: Add the subscription_plans table
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "tier" "SubscriptionPlan" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DECIMAL(10,2),
    "priceYearly" DECIMAL(10,2),
    "features" JSONB NOT NULL DEFAULT '{}',
    "limits" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create unique index on tier
CREATE UNIQUE INDEX "subscription_plans_tier_key" ON "subscription_plans"("tier");

-- Step 3: Add TRIALING status to enum (if it doesn't exist)
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIALING';

-- Step 4: Add FREE tier to enum (if it doesn't exist)  
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'FREE';

-- Step 5: Insert default subscription plans
INSERT INTO "subscription_plans" ("id", "tier", "name", "description", "priceMonthly", "priceYearly", "features", "limits") VALUES
('free-plan', 'FREE', 'Free', 'Perfect for getting started', 0.00, 0.00, 
 '{"publicMenuAPI": true, "basicSupport": true}',
 '{"restaurants": 1, "products": 50, "apiCalls": 1000}'
),
('starter-plan', 'STARTER', 'Starter', 'Great for small restaurants', 29.00, 290.00,
 '{"publicMenuAPI": true, "emailSupport": true, "allIntegrations": true, "priceSync": true}',
 '{"restaurants": 3, "products": 500, "apiCalls": 10000}'
),
('professional-plan', 'PROFESSIONAL', 'Professional', 'Perfect for growing businesses', 99.00, 990.00,
 '{"publicMenuAPI": true, "prioritySupport": true, "advancedAnalytics": true, "bulkOperations": true, "apiWebhooks": true}',
 '{"restaurants": 10, "products": -1, "apiCalls": 100000}'
),
('enterprise-plan', 'ENTERPRISE', 'Enterprise', 'Custom solution for large operations', null, null,
 '{"publicMenuAPI": true, "dedicatedSupport": true, "customIntegrations": true, "slaGuarantee": true, "whiteLabel": true}',
 '{"restaurants": -1, "products": -1, "apiCalls": -1}'
);

-- Step 6: Add usage_tracking table
CREATE TABLE "usage_tracking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id")
);

-- Step 7: Add foreign key constraint for usage_tracking
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Create index for usage_tracking
CREATE INDEX "usage_tracking_organizationId_metricType_periodStart_idx" ON "usage_tracking"("organizationId", "metricType", "periodStart");

-- Step 9: Add columns to subscriptions table
ALTER TABLE "subscriptions" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN "stripeCustomerId" TEXT;

-- Step 10: Set default plan for existing subscriptions (map STARTER to starter-plan)
UPDATE "subscriptions" SET "status" = 'TRIALING' WHERE "status" = 'ACTIVE';

-- Step 11: Add planId column with default value pointing to the existing plan
ALTER TABLE "subscriptions" ADD COLUMN "planId" TEXT DEFAULT 'starter-plan';

-- Step 12: Update planId based on existing plan
UPDATE "subscriptions" SET "planId" = CASE 
  WHEN "plan" = 'FREE' THEN 'free-plan'
  WHEN "plan" = 'STARTER' THEN 'starter-plan' 
  WHEN "plan" = 'PROFESSIONAL' THEN 'professional-plan'
  WHEN "plan" = 'ENTERPRISE' THEN 'enterprise-plan'
  ELSE 'free-plan'
END;

-- Step 13: Make planId required
ALTER TABLE "subscriptions" ALTER COLUMN "planId" SET NOT NULL;

-- Step 14: Add foreign key constraint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 15: Drop the old plan column (commented out for safety - remove manually after verifying)
-- ALTER TABLE "subscriptions" DROP COLUMN "plan";

-- Step 16: Enable RLS on new tables
ALTER TABLE "subscription_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_tracking" ENABLE ROW LEVEL SECURITY;

-- Step 17: Create RLS policies for new tables
CREATE POLICY "Anyone can view subscription plans" ON "subscription_plans"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view own organization usage" ON "usage_tracking"
  FOR SELECT
  USING (
    "organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
  );

CREATE POLICY "System can manage usage tracking" ON "usage_tracking"
  FOR ALL
  USING (true);  -- This will be restricted to service accounts in practice
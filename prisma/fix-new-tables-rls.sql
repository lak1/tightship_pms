-- Fix RLS for new tables created in Phase 2

-- 1. Enable RLS on subscription_plans table
ALTER TABLE "subscription_plans" ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on usage_tracking table  
ALTER TABLE "usage_tracking" ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for subscription_plans
-- Allow everyone to view subscription plans (they're public information)
CREATE POLICY "Anyone can view subscription plans" ON "subscription_plans"
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can manage subscription plans (will be restricted to admin users later)
CREATE POLICY "System can manage subscription plans" ON "subscription_plans"
  FOR ALL
  USING (false); -- This blocks all modifications through PostgREST

-- 4. Create RLS policies for usage_tracking
-- Users can only view their own organization's usage
CREATE POLICY "Users can view own organization usage" ON "usage_tracking"
  FOR SELECT
  USING (
    "organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
  );

-- System can create and update usage tracking (for API tracking)
CREATE POLICY "System can manage usage tracking" ON "usage_tracking"
  FOR INSERT
  WITH CHECK (true); -- This will be restricted to service accounts in practice

CREATE POLICY "System can update usage tracking" ON "usage_tracking"
  FOR UPDATE
  USING (true); -- This will be restricted to service accounts in practice

-- Users cannot directly delete usage tracking data
-- (Only system/admin should be able to do this)
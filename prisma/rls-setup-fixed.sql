-- RLS (Row Level Security) Setup for Tightship PMS - FIXED VERSION
-- Run this in your Supabase SQL editor

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on authentication tables
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Google integration tables
ALTER TABLE google_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_menu_mappings ENABLE ROW LEVEL SECURITY;

-- 2. Create helper function to get current user's organization (FIXED COLUMN NAMES)
CREATE OR REPLACE FUNCTION get_user_organization_id(user_email text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT "organizationId" 
  FROM users 
  WHERE email = user_email 
  AND "isActive" = true
  LIMIT 1;
$$;

-- 3. Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Allow user creation" ON users
  FOR INSERT
  WITH CHECK (true);

-- 4. Organizations table policies
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT
  USING (id = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can update own organization" ON organizations
  FOR UPDATE
  USING (id = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email'));

-- 5. Subscriptions table policies
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT
  USING ("organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email'));

-- 6. Restaurants table policies
CREATE POLICY "Users can view own restaurants" ON restaurants
  FOR SELECT
  USING ("organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can manage own restaurants" ON restaurants
  FOR ALL
  USING ("organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email'));

-- 7. Menus table policies
CREATE POLICY "Users can manage own menus" ON menus
  FOR ALL
  USING (
    "restaurantId" IN (
      SELECT id FROM restaurants 
      WHERE "organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- 8. Categories table policies
CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL
  USING (
    "menuId" IN (
      SELECT m.id FROM menus m
      JOIN restaurants r ON m."restaurantId" = r.id
      WHERE r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- 9. Products table policies
CREATE POLICY "Users can manage own products" ON products
  FOR ALL
  USING (
    "menuId" IN (
      SELECT m.id FROM menus m
      JOIN restaurants r ON m."restaurantId" = r.id
      WHERE r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- 10. Tax rates policies (shared resource, read-only for users)
CREATE POLICY "Anyone can view tax rates" ON tax_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- 11. Modifier groups and modifiers policies
CREATE POLICY "Users can manage own modifier groups" ON modifier_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM product_modifier_groups pmg
      JOIN products p ON pmg."productId" = p.id
      JOIN menus m ON p."menuId" = m.id
      JOIN restaurants r ON m."restaurantId" = r.id
      WHERE pmg."modifierGroupId" = modifier_groups.id
      AND r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
    OR NOT EXISTS (SELECT 1 FROM product_modifier_groups WHERE "modifierGroupId" = modifier_groups.id)
  );

CREATE POLICY "Users can manage own modifiers" ON modifiers
  FOR ALL
  USING (
    "modifierGroupId" IN (
      SELECT mg.id FROM modifier_groups mg
      WHERE EXISTS (
        SELECT 1 FROM product_modifier_groups pmg
        JOIN products p ON pmg."productId" = p.id
        JOIN menus m ON p."menuId" = m.id
        JOIN restaurants r ON m."restaurantId" = r.id
        WHERE pmg."modifierGroupId" = mg.id
        AND r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
      )
    )
  );

CREATE POLICY "Users can manage own product modifier groups" ON product_modifier_groups
  FOR ALL
  USING (
    "productId" IN (
      SELECT p.id FROM products p
      JOIN menus m ON p."menuId" = m.id
      JOIN restaurants r ON m."restaurantId" = r.id
      WHERE r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- 12. Platforms policies (shared resource, read-only)
CREATE POLICY "Anyone can view platforms" ON platforms
  FOR SELECT
  TO authenticated
  USING (true);

-- 13. Prices and price history policies
CREATE POLICY "Users can manage own prices" ON prices
  FOR ALL
  USING (
    "productId" IN (
      SELECT p.id FROM products p
      JOIN menus m ON p."menuId" = m.id
      JOIN restaurants r ON m."restaurantId" = r.id
      WHERE r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

CREATE POLICY "Users can view own price history" ON price_history
  FOR SELECT
  USING (
    "productId" IN (
      SELECT p.id FROM products p
      JOIN menus m ON p."menuId" = m.id
      JOIN restaurants r ON m."restaurantId" = r.id
      WHERE r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

CREATE POLICY "Users can create price history" ON price_history
  FOR INSERT
  WITH CHECK (
    "productId" IN (
      SELECT p.id FROM products p
      JOIN menus m ON p."menuId" = m.id
      JOIN restaurants r ON m."restaurantId" = r.id
      WHERE r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- 14. Integrations policies
CREATE POLICY "Users can manage own integrations" ON integrations
  FOR ALL
  USING (
    "restaurantId" IN (
      SELECT id FROM restaurants 
      WHERE "organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- 15. Platform mappings policies
CREATE POLICY "Users can manage own platform mappings" ON platform_mappings
  FOR ALL
  USING (
    "productId" IN (
      SELECT p.id FROM products p
      JOIN menus m ON p."menuId" = m.id
      JOIN restaurants r ON m."restaurantId" = r.id
      WHERE r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- 16. Price rules policies
CREATE POLICY "Users can manage own price rules" ON price_rules
  FOR ALL
  USING (
    "restaurantId" IN (
      SELECT id FROM restaurants 
      WHERE "organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- 17. Sync jobs policies
CREATE POLICY "Users can view own sync jobs" ON sync_jobs
  FOR SELECT
  USING (
    "restaurantId" IN (
      SELECT id FROM restaurants 
      WHERE "organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

CREATE POLICY "Users can create sync jobs" ON sync_jobs
  FOR INSERT
  WITH CHECK (
    "restaurantId" IN (
      SELECT id FROM restaurants 
      WHERE "organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

CREATE POLICY "Users can update own sync jobs" ON sync_jobs
  FOR UPDATE
  USING (
    "restaurantId" IN (
      SELECT id FROM restaurants 
      WHERE "organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- 18. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organizationId ON users("organizationId");
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_restaurants_organizationId ON restaurants("organizationId");
CREATE INDEX IF NOT EXISTS idx_menus_restaurantId ON menus("restaurantId");
CREATE INDEX IF NOT EXISTS idx_products_menuId ON products("menuId");
CREATE INDEX IF NOT EXISTS idx_prices_productId ON prices("productId");
CREATE INDEX IF NOT EXISTS idx_integrations_restaurantId ON integrations("restaurantId");

-- 19. Authentication tables policies
CREATE POLICY "Users can view own accounts" ON "Account"
  FOR SELECT
  USING (
    "userId" IN (
      SELECT id FROM users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Users can manage own accounts" ON "Account"
  FOR ALL
  USING (
    "userId" IN (
      SELECT id FROM users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Users can view own sessions" ON "Session"
  FOR SELECT
  USING (
    "userId" IN (
      SELECT id FROM users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Users can manage own sessions" ON "Session"
  FOR ALL
  USING (
    "userId" IN (
      SELECT id FROM users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- VerificationToken policies (these are typically managed by the auth system)
CREATE POLICY "Allow verification token operations" ON "VerificationToken"
  FOR ALL
  USING (true);

-- 20. Google integration tables policies
CREATE POLICY "Users can manage own google integrations" ON google_integrations
  FOR ALL
  USING (
    "restaurantId" IN (
      SELECT id FROM restaurants 
      WHERE "organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

CREATE POLICY "Users can view own google sync history" ON google_sync_history
  FOR SELECT
  USING (
    "integrationId" IN (
      SELECT gi.id FROM google_integrations gi
      JOIN restaurants r ON gi."restaurantId" = r.id
      WHERE r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

CREATE POLICY "Users can create google sync history" ON google_sync_history
  FOR INSERT
  WITH CHECK (
    "integrationId" IN (
      SELECT gi.id FROM google_integrations gi
      JOIN restaurants r ON gi."restaurantId" = r.id
      WHERE r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

CREATE POLICY "Users can manage own google menu mappings" ON google_menu_mappings
  FOR ALL
  USING (
    "productId" IN (
      SELECT p.id FROM products p
      JOIN menus m ON p."menuId" = m.id
      JOIN restaurants r ON m."restaurantId" = r.id
      WHERE r."organizationId" = get_user_organization_id(current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- 21. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
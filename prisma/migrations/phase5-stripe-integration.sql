-- Phase 5: Stripe Integration - Subscription Plans Setup
-- This migration creates the default subscription plans for the Tightship PMS platform

INSERT INTO subscription_plans (
  id,
  tier,
  name,
  description,
  "priceMonthly",
  "priceYearly",
  features,
  limits,
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES 
-- FREE Plan
(
  gen_random_uuid(),
  'FREE',
  'Free',
  'Perfect for getting started with basic menu management',
  0.00,
  0.00,
  '{
    "menuManagement": true,
    "basicSync": false,
    "emailSupport": true,
    "publicAPI": true,
    "analytics": false,
    "bulkOperations": false,
    "apiWebhooks": false,
    "prioritySupport": false,
    "customIntegrations": false,
    "whiteLabel": false
  }',
  '{
    "restaurants": 1,
    "products": 50,
    "apiCalls": 1000,
    "integrations": 0,
    "users": 2
  }',
  true,
  NOW(),
  NOW()
),
-- STARTER Plan
(
  gen_random_uuid(),
  'STARTER',
  'Starter',
  'Great for small restaurants with multiple platforms',
  29.00,
  290.00,
  '{
    "menuManagement": true,
    "basicSync": true,
    "emailSupport": true,
    "publicAPI": true,
    "analytics": true,
    "bulkOperations": false,
    "apiWebhooks": false,
    "prioritySupport": false,
    "customIntegrations": false,
    "whiteLabel": false
  }',
  '{
    "restaurants": 3,
    "products": 500,
    "apiCalls": 10000,
    "integrations": 3,
    "users": 5
  }',
  true,
  NOW(),
  NOW()
),
-- PROFESSIONAL Plan
(
  gen_random_uuid(),
  'PROFESSIONAL',
  'Professional',
  'Perfect for growing restaurant businesses',
  99.00,
  990.00,
  '{
    "menuManagement": true,
    "basicSync": true,
    "emailSupport": true,
    "publicAPI": true,
    "analytics": true,
    "bulkOperations": true,
    "apiWebhooks": true,
    "prioritySupport": true,
    "customIntegrations": false,
    "whiteLabel": false
  }',
  '{
    "restaurants": 10,
    "products": -1,
    "apiCalls": 100000,
    "integrations": -1,
    "users": 15
  }',
  true,
  NOW(),
  NOW()
),
-- ENTERPRISE Plan
(
  gen_random_uuid(),
  'ENTERPRISE',
  'Enterprise',
  'Unlimited features for large restaurant chains',
  NULL,
  NULL,
  '{
    "menuManagement": true,
    "basicSync": true,
    "emailSupport": true,
    "publicAPI": true,
    "analytics": true,
    "bulkOperations": true,
    "apiWebhooks": true,
    "prioritySupport": true,
    "customIntegrations": true,
    "whiteLabel": true
  }',
  '{
    "restaurants": -1,
    "products": -1,
    "apiCalls": -1,
    "integrations": -1,
    "users": -1
  }',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "priceMonthly" = EXCLUDED."priceMonthly",
  "priceYearly" = EXCLUDED."priceYearly",
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  "updatedAt" = NOW();
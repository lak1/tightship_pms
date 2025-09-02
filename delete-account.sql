-- Delete account for YOUR_EMAIL_HERE
-- This will delete all associated data including organization, restaurants, menus, products, etc.

-- First, find the user and their organization
SELECT u.id as user_id, u.email, u."organizationId", o.name as org_name 
FROM users u 
LEFT JOIN organizations o ON u."organizationId" = o.id 
WHERE u.email = 'YOUR_EMAIL_HERE';

-- Then delete in this order (due to foreign key constraints):
-- 1. Delete related data first
DELETE FROM sync_jobs WHERE "restaurantId" IN (
    SELECT r.id FROM restaurants r 
    JOIN users u ON r."organizationId" = u."organizationId" 
    WHERE u.email = 'YOUR_EMAIL_HERE'
);

DELETE FROM platform_mappings WHERE "productId" IN (
    SELECT p.id FROM products p 
    JOIN menus m ON p."menuId" = m.id 
    JOIN restaurants r ON m."restaurantId" = r.id 
    JOIN users u ON r."organizationId" = u."organizationId" 
    WHERE u.email = 'YOUR_EMAIL_HERE'
);

DELETE FROM integrations WHERE "restaurantId" IN (
    SELECT r.id FROM restaurants r 
    JOIN users u ON r."organizationId" = u."organizationId" 
    WHERE u.email = 'YOUR_EMAIL_HERE'
);

DELETE FROM price_history WHERE "productId" IN (
    SELECT p.id FROM products p 
    JOIN menus m ON p."menuId" = m.id 
    JOIN restaurants r ON m."restaurantId" = r.id 
    JOIN users u ON r."organizationId" = u."organizationId" 
    WHERE u.email = 'YOUR_EMAIL_HERE'
);

DELETE FROM prices WHERE "productId" IN (
    SELECT p.id FROM products p 
    JOIN menus m ON p."menuId" = m.id 
    JOIN restaurants r ON m."restaurantId" = r.id 
    JOIN users u ON r."organizationId" = u."organizationId" 
    WHERE u.email = 'YOUR_EMAIL_HERE'
);

DELETE FROM product_modifier_groups WHERE "productId" IN (
    SELECT p.id FROM products p 
    JOIN menus m ON p."menuId" = m.id 
    JOIN restaurants r ON m."restaurantId" = r.id 
    JOIN users u ON r."organizationId" = u."organizationId" 
    WHERE u.email = 'YOUR_EMAIL_HERE'
);

DELETE FROM products WHERE "menuId" IN (
    SELECT m.id FROM menus m 
    JOIN restaurants r ON m."restaurantId" = r.id 
    JOIN users u ON r."organizationId" = u."organizationId" 
    WHERE u.email = 'YOUR_EMAIL_HERE'
);

DELETE FROM categories WHERE "menuId" IN (
    SELECT m.id FROM menus m 
    JOIN restaurants r ON m."restaurantId" = r.id 
    JOIN users u ON r."organizationId" = u."organizationId" 
    WHERE u.email = 'YOUR_EMAIL_HERE'
);

DELETE FROM menus WHERE "restaurantId" IN (
    SELECT r.id FROM restaurants r 
    JOIN users u ON r."organizationId" = u."organizationId" 
    WHERE u.email = 'YOUR_EMAIL_HERE'
);

DELETE FROM restaurants WHERE "organizationId" IN (
    SELECT "organizationId" FROM users WHERE email = 'YOUR_EMAIL_HERE'
);

DELETE FROM subscriptions WHERE "organizationId" IN (
    SELECT "organizationId" FROM users WHERE email = 'YOUR_EMAIL_HERE'
);

DELETE FROM organizations WHERE id IN (
    SELECT "organizationId" FROM users WHERE email = 'YOUR_EMAIL_HERE'
);

-- Finally delete the user
DELETE FROM users WHERE email = 'YOUR_EMAIL_HERE';
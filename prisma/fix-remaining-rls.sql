-- Fix remaining RLS issues

-- 1. Enable RLS on _prisma_migrations table and create policy
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Create a restrictive policy for _prisma_migrations (system table - typically only needs admin access)
CREATE POLICY "Admin only access to prisma migrations" ON "_prisma_migrations"
  FOR ALL
  USING (false); -- This effectively blocks all access through PostgREST

-- 2. Fix the search_path security warning by recreating the function with proper search_path
CREATE OR REPLACE FUNCTION get_user_organization_id(user_email text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "organizationId" 
  FROM users 
  WHERE email = user_email 
  AND "isActive" = true
  LIMIT 1;
$$;
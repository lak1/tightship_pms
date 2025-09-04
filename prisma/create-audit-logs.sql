-- Create audit_logs table with enum
DO $$ BEGIN
    CREATE TYPE "AuditAction" AS ENUM (
        'USER_CREATED',
        'USER_UPDATED', 
        'USER_DELETED',
        'USER_ROLE_CHANGED',
        'USER_ACTIVATED',
        'USER_DEACTIVATED',
        'ORGANIZATION_CREATED',
        'ORGANIZATION_UPDATED',
        'ORGANIZATION_DELETED',
        'ORGANIZATION_SUSPENDED',
        'ORGANIZATION_REACTIVATED',
        'SUBSCRIPTION_CREATED',
        'SUBSCRIPTION_UPDATED',
        'SUBSCRIPTION_CANCELLED',
        'SUBSCRIPTION_UPGRADED',
        'SUBSCRIPTION_DOWNGRADED',
        'ADMIN_LOGIN',
        'ADMIN_LOGOUT',
        'SYSTEM_SETTINGS_CHANGED',
        'BULK_ACTION_PERFORMED',
        'PASSWORD_RESET_REQUESTED',
        'ACCOUNT_LOCKED',
        'ACCOUNT_UNLOCKED',
        'SUSPICIOUS_ACTIVITY_DETECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "targetId" TEXT,
    "targetType" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Add RLS policy for audit_logs if needed
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_policy" ON "audit_logs" FOR ALL USING (true);
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { SubscriptionService } from '@/lib/subscriptions';
import { GracePeriodService } from '@/lib/services/grace-period';
import { SubscriptionStatus } from '@/components/billing/subscription-status';
import { PlanComparison } from '@/components/billing/plan-comparison';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CreditCard } from 'lucide-react';

async function BillingContent() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  // Get user's organization
  const user = await db.users.findUnique({
    where: { email: session.user.email },
    include: { organizations: true }
  });

  if (!user?.organizationId) {
    redirect('/onboarding');
  }

  // Get subscription and usage data
  const [subscriptionStatus, usageStats, warnings, availablePlans] = await Promise.all([
    SubscriptionService.getSubscriptionStatus(user.organizationId),
    SubscriptionService.getUsageStats(user.organizationId),
    GracePeriodService.getSubscriptionWarnings(user.organizationId),
    db.subscription_plans.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' }
    })
  ]);

  // Prepare plans with comparison data
  const currentTier = subscriptionStatus.plan?.tier;
  const plansWithComparison = availablePlans.map(plan => ({
    ...plan,
    isCurrent: plan.tier === currentTier,
    isUpgrade: isUpgrade(currentTier, plan.tier),
    isDowngrade: isDowngrade(currentTier, plan.tier)
  }));

  const handlePlanChange = async (planId: string) => {
    'use server';
    // This would typically integrate with Stripe
    console.log('Plan change requested:', planId);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and view usage statistics
        </p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-4">
          {warnings.map((warning, index) => (
            <Alert 
              key={index} 
              variant={warning.type === 'critical' ? 'destructive' : 'default'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{warning.title}</AlertTitle>
              <AlertDescription>{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Current Subscription Status */}
      <SubscriptionStatus
        subscription={subscriptionStatus}
        usageStats={usageStats}
        onUpgrade={() => {
          // Scroll to plans section
          document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onManageBilling={() => {
          // Open Stripe billing portal (to be implemented)
          console.log('Open billing portal');
        }}
        onCancelSubscription={() => {
          // Open cancellation modal (to be implemented)
          console.log('Cancel subscription');
        }}
        onReactivateSubscription={() => {
          // Reactivate subscription (to be implemented)
          console.log('Reactivate subscription');
        }}
      />

      {/* Plan Comparison */}
      <div id="plans-section" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Choose Your Plan</h2>
          <p className="text-muted-foreground mt-2">
            Upgrade or downgrade your subscription to match your needs
          </p>
        </div>

        <PlanComparison
          plans={plansWithComparison}
          currentPlanId={subscriptionStatus.plan?.id}
          onSelectPlan={(planId) => {
            // This would open Stripe checkout or plan change flow
            console.log('Selected plan:', planId);
          }}
        />
      </div>

      {/* Billing History */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Billing History</h2>
          <p className="text-muted-foreground mt-2">
            View your past invoices and payment history
          </p>
        </div>

        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertTitle>Stripe Integration Pending</AlertTitle>
          <AlertDescription>
            Billing history and payment management will be available once Stripe integration is completed in Phase 5.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent />
    </Suspense>
  );
}

// Helper functions (these would be moved to utils)
function isUpgrade(currentTier?: string, newTier?: string): boolean {
  const tierOrder = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  const currentIndex = tierOrder.indexOf(currentTier || 'FREE');
  const newIndex = tierOrder.indexOf(newTier || 'FREE');
  return newIndex > currentIndex;
}

function isDowngrade(currentTier?: string, newTier?: string): boolean {
  const tierOrder = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  const currentIndex = tierOrder.indexOf(currentTier || 'FREE');
  const newIndex = tierOrder.indexOf(newTier || 'FREE');
  return newIndex < currentIndex;
}
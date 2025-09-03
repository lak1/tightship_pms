const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedSubscriptionPlans() {
  console.log('Seeding subscription plans...');

  const plans = [
    {
      id: 'free-plan',
      tier: 'FREE',
      name: 'Free',
      description: 'Perfect for getting started',
      priceMonthly: 0.00,
      priceYearly: 0.00,
      features: {
        publicMenuAPI: true,
        basicSupport: true
      },
      limits: {
        restaurants: 1,
        products: 50,
        apiCalls: 1000
      }
    },
    {
      id: 'starter-plan',
      tier: 'STARTER',
      name: 'Starter',
      description: 'Great for small restaurants',
      priceMonthly: 29.00,
      priceYearly: 290.00,
      features: {
        publicMenuAPI: true,
        emailSupport: true,
        allIntegrations: true,
        priceSync: true
      },
      limits: {
        restaurants: 3,
        products: 500,
        apiCalls: 10000
      }
    },
    {
      id: 'professional-plan',
      tier: 'PROFESSIONAL',
      name: 'Professional',
      description: 'Perfect for growing businesses',
      priceMonthly: 99.00,
      priceYearly: 990.00,
      features: {
        publicMenuAPI: true,
        prioritySupport: true,
        advancedAnalytics: true,
        bulkOperations: true,
        apiWebhooks: true
      },
      limits: {
        restaurants: 10,
        products: -1, // unlimited
        apiCalls: 100000
      }
    },
    {
      id: 'enterprise-plan',
      tier: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Custom solution for large operations',
      priceMonthly: null,
      priceYearly: null,
      features: {
        publicMenuAPI: true,
        dedicatedSupport: true,
        customIntegrations: true,
        slaGuarantee: true,
        whiteLabel: true
      },
      limits: {
        restaurants: -1, // unlimited
        products: -1, // unlimited
        apiCalls: -1 // unlimited
      }
    }
  ];

  for (const plan of plans) {
    try {
      await prisma.subscription_plans.upsert({
        where: { tier: plan.tier },
        update: {
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          features: plan.features,
          limits: plan.limits,
        },
        create: plan,
      });
      console.log(`✓ Created/updated plan: ${plan.name}`);
    } catch (error) {
      console.error(`✗ Error creating plan ${plan.name}:`, error);
    }
  }

  // Update existing subscriptions to use new plan system
  console.log('\nMigrating existing subscriptions...');
  
  const existingSubscriptions = await prisma.subscriptions.findMany({
    where: { planId: null }
  });

  for (const subscription of existingSubscriptions) {
    const planId = `${subscription.plan.toLowerCase()}-plan`;
    try {
      await prisma.subscriptions.update({
        where: { id: subscription.id },
        data: { 
          planId: planId,
          status: subscription.status === 'ACTIVE' ? 'TRIALING' : subscription.status
        }
      });
      console.log(`✓ Migrated subscription ${subscription.id} to plan ${planId}`);
    } catch (error) {
      console.error(`✗ Error migrating subscription ${subscription.id}:`, error);
    }
  }

  console.log('\n✅ Subscription plans seeding completed!');
}

seedSubscriptionPlans()
  .catch((e) => {
    console.error('❌ Error seeding subscription plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
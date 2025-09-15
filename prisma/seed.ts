import { PrismaClient, UserRole, SubscriptionPlan, SubscriptionStatus, PlatformType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create platforms
  const platforms = await Promise.all([
    prisma.platforms.upsert({
      where: { name: 'Deliveroo' },
      update: {},
      create: {
        name: 'Deliveroo',
        type: PlatformType.DELIVERY,
        logoUrl: 'https://i.imgur.com/deliveroo-logo.png',
        settings: JSON.stringify({
          baseUrl: 'https://api.deliveroo.com',
          authType: 'oauth2',
        }),
      },
    }),
    prisma.platforms.upsert({
      where: { name: 'Uber Eats' },
      update: {},
      create: {
        name: 'Uber Eats',
        type: PlatformType.DELIVERY,
        logoUrl: 'https://i.imgur.com/uber-eats-logo.png',
        settings: JSON.stringify({
          baseUrl: 'https://api.uber.com',
          authType: 'oauth2',
        }),
      },
    }),
    prisma.platforms.upsert({
      where: { name: 'Just Eat' },
      update: {},
      create: {
        name: 'Just Eat',
        type: PlatformType.DELIVERY,
        logoUrl: 'https://i.imgur.com/just-eat-logo.png',
        settings: JSON.stringify({
          baseUrl: 'https://api.just-eat.com',
          authType: 'api_key',
        }),
      },
    }),
    prisma.platforms.upsert({
      where: { name: 'Square POS' },
      update: {},
      create: {
        name: 'Square POS',
        type: PlatformType.POS,
        logoUrl: 'https://i.imgur.com/square-logo.png',
        settings: JSON.stringify({
          baseUrl: 'https://connect.squareup.com',
          authType: 'oauth2',
        }),
      },
    }),
    prisma.platforms.upsert({
      where: { name: 'Website' },
      update: {},
      create: {
        name: 'Website',
        type: PlatformType.WEBSITE,
        logoUrl: 'https://i.imgur.com/website-logo.png',
        settings: JSON.stringify({
          baseUrl: '',
          authType: 'webhook',
        }),
      },
    }),
  ])

  console.log(`✅ Created ${platforms.length} platforms`)

  // Create tax rates
  const taxRates = await Promise.all([
    prisma.tax_rates.upsert({
      where: { id: 'tax-rate-1' },
      update: {},
      create: {
        id: 'tax-rate-1',
        name: 'Standard VAT',
        rate: 0.20,
        description: 'UK Standard VAT rate',
      },
    }),
    prisma.tax_rates.upsert({
      where: { id: 'tax-rate-2' },
      update: {},
      create: {
        id: 'tax-rate-2',
        name: 'Reduced VAT',
        rate: 0.05,
        description: 'UK Reduced VAT rate for food',
      },
    }),
    prisma.tax_rates.upsert({
      where: { id: 'tax-rate-3' },
      update: {},
      create: {
        id: 'tax-rate-3',
        name: 'Zero VAT',
        rate: 0.00,
        description: 'Zero-rated items',
      },
    }),
  ])

  console.log(`✅ Created ${taxRates.length} tax rates`)

  // Create demo organization
  const organization = await prisma.organizations.upsert({
    where: { slug: 'demo-restaurant-group' },
    update: {},
    create: {
      name: 'Demo Restaurant Group',
      slug: 'demo-restaurant-group',
      settings: JSON.stringify({
        timezone: 'Europe/London',
        currency: 'GBP',
        dateFormat: 'DD/MM/YYYY',
        taxInclusive: false,
      }),
    },
  })

  console.log(`✅ Created organization: ${organization.name}`)

  // Create subscription plans
  const subscriptionPlans = await Promise.all([
    prisma.subscription_plans.upsert({
      where: { tier: 'FREE' },
      update: {},
      create: {
        tier: SubscriptionPlan.FREE,
        name: 'Free Plan',
        description: 'Perfect for getting started',
        priceMonthly: 0,
        priceYearly: 0,
        features: JSON.stringify({
          restaurants: true,
          products: true,
          integrations: true,
          analytics: false,
          priority_support: false,
          custom_branding: false
        }),
        limits: JSON.stringify({
          restaurants: 1,
          products: 50,
          apiCalls: 1000
        }),
      },
    }),
    prisma.subscription_plans.upsert({
      where: { tier: 'STARTER' },
      update: {},
      create: {
        tier: SubscriptionPlan.STARTER,
        name: 'Starter Plan',
        description: 'Great for small restaurants',
        priceMonthly: 29,
        priceYearly: 290,
        features: JSON.stringify({
          restaurants: true,
          products: true,
          integrations: true,
          analytics: true,
          priority_support: false,
          custom_branding: false
        }),
        limits: JSON.stringify({
          restaurants: 2,
          products: 200,
          apiCalls: 5000
        }),
      },
    }),
    prisma.subscription_plans.upsert({
      where: { tier: 'PROFESSIONAL' },
      update: {},
      create: {
        tier: SubscriptionPlan.PROFESSIONAL,
        name: 'Professional Plan',
        description: 'Perfect for growing restaurant groups',
        priceMonthly: 99,
        priceYearly: 990,
        features: JSON.stringify({
          restaurants: true,
          products: true,
          integrations: true,
          analytics: true,
          priority_support: true,
          custom_branding: true
        }),
        limits: JSON.stringify({
          restaurants: 10,
          products: 1000,
          apiCalls: 25000
        }),
      },
    }),
    prisma.subscription_plans.upsert({
      where: { tier: 'ENTERPRISE' },
      update: {},
      create: {
        tier: SubscriptionPlan.ENTERPRISE,
        name: 'Enterprise Plan',
        description: 'For large restaurant chains',
        priceMonthly: null,
        priceYearly: null,
        features: JSON.stringify({
          restaurants: true,
          products: true,
          integrations: true,
          analytics: true,
          priority_support: true,
          custom_branding: true,
          dedicated_account_manager: true,
          custom_integrations: true
        }),
        limits: JSON.stringify({
          restaurants: -1,
          products: -1,
          apiCalls: -1
        }),
      },
    }),
  ])

  console.log(`✅ Created ${subscriptionPlans.length} subscription plans`)

  // Create subscription
  const subscription = await prisma.subscriptions.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      plan: SubscriptionPlan.PROFESSIONAL,
      planId: subscriptionPlans[2].id, // Professional plan
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  })

  console.log(`✅ Created subscription for organization`)

  // Create demo user
  const user = await prisma.users.upsert({
    where: { email: 'demo@tightship.com' },
    update: {},
    create: {
      email: 'demo@tightship.com',
      name: 'Demo User',
      role: UserRole.OWNER,
      organizationId: organization.id,
      emailVerified: new Date(),
    },
  })

  console.log(`✅ Created user: ${user.email}`)

  // Create demo restaurant
  const restaurant = await prisma.restaurants.upsert({
    where: { id: 'demo-restaurant-1' },
    update: {},
    create: {
      id: 'demo-restaurant-1',
      name: 'The Gourmet Kitchen',
      organizationId: organization.id,
      address: JSON.stringify({
        street: '123 High Street',
        city: 'London',
        state: 'England',
        postalCode: 'SW1A 1AA',
        country: 'United Kingdom',
      }),
      timezone: 'Europe/London',
      settings: JSON.stringify({
        operatingHours: [
          { day: 'monday', open: '09:00', close: '22:00' },
          { day: 'tuesday', open: '09:00', close: '22:00' },
          { day: 'wednesday', open: '09:00', close: '22:00' },
          { day: 'thursday', open: '09:00', close: '22:00' },
          { day: 'friday', open: '09:00', close: '23:00' },
          { day: 'saturday', open: '10:00', close: '23:00' },
          { day: 'sunday', open: '10:00', close: '21:00' },
        ],
        autoSync: true,
        syncSchedule: '0 */15 * * * *', // Every 15 minutes
      }),
    },
  })

  console.log(`✅ Created restaurant: ${restaurant.name}`)

  // Create menu
  const menu = await prisma.menus.upsert({
    where: { id: 'demo-menu-1' },
    update: {},
    create: {
      id: 'demo-menu-1',
      name: 'Main Menu',
      description: 'Our signature dishes and favorites',
      restaurantId: restaurant.id,
    },
  })

  console.log(`✅ Created menu: ${menu.name}`)

  // Create categories
  const categories = await Promise.all([
    prisma.categories.upsert({
      where: { id: 'category-starters' },
      update: {},
      create: {
        id: 'category-starters',
        name: 'Starters',
        description: 'Light bites to start your meal',
        menuId: menu.id,
        displayOrder: 1,
      },
    }),
    prisma.categories.upsert({
      where: { id: 'category-mains' },
      update: {},
      create: {
        id: 'category-mains',
        name: 'Main Courses',
        description: 'Hearty dishes and signature meals',
        menuId: menu.id,
        displayOrder: 2,
      },
    }),
    prisma.categories.upsert({
      where: { id: 'category-desserts' },
      update: {},
      create: {
        id: 'category-desserts',
        name: 'Desserts',
        description: 'Sweet treats to finish your meal',
        menuId: menu.id,
        displayOrder: 3,
      },
    }),
    prisma.categories.upsert({
      where: { id: 'category-drinks' },
      update: {},
      create: {
        id: 'category-drinks',
        name: 'Beverages',
        description: 'Hot and cold drinks',
        menuId: menu.id,
        displayOrder: 4,
      },
    }),
  ])

  console.log(`✅ Created ${categories.length} categories`)

  // Create sample products
  const products = [
    {
      id: 'product-1',
      name: 'Truffle Arancini',
      description: 'Crispy risotto balls with truffle oil and parmesan',
      categoryId: categories[0].id, // Starters
      basePrice: 8.50,
      sku: 'START-001',
      allergens: ['gluten', 'dairy'],
      dietaryInfo: ['vegetarian'],
    },
    {
      id: 'product-2',
      name: 'Pan-Seared Salmon',
      description: 'Fresh Atlantic salmon with lemon herb butter and seasonal vegetables',
      categoryId: categories[1].id, // Mains
      basePrice: 18.95,
      sku: 'MAIN-001',
      allergens: ['fish'],
      dietaryInfo: ['gluten-free'],
    },
    {
      id: 'product-3',
      name: 'Chocolate Fondant',
      description: 'Warm chocolate cake with molten center, served with vanilla ice cream',
      categoryId: categories[2].id, // Desserts
      basePrice: 7.25,
      sku: 'DESS-001',
      allergens: ['dairy', 'eggs', 'gluten'],
      dietaryInfo: ['vegetarian'],
    },
    {
      id: 'product-4',
      name: 'Craft Beer Selection',
      description: 'Local brewery pale ale, hoppy and refreshing',
      categoryId: categories[3].id, // Drinks
      basePrice: 5.50,
      sku: 'DRINK-001',
      allergens: ['gluten'],
      dietaryInfo: ['vegan'],
    },
    {
      id: 'product-5',
      name: 'Margherita Pizza',
      description: 'Traditional pizza with tomato sauce, mozzarella, and fresh basil',
      categoryId: categories[1].id, // Mains
      basePrice: 12.50,
      sku: 'MAIN-002',
      allergens: ['gluten', 'dairy'],
      dietaryInfo: ['vegetarian'],
    },
  ]

  for (const productData of products) {
    const product = await prisma.products.upsert({
      where: { id: productData.id },
      update: {},
      create: {
        ...productData,
        menuId: menu.id,
        taxRateId: taxRates[1].id, // Reduced VAT for food
        priceControl: 'MANUAL',
        availability: JSON.stringify({
          always: true,
        }),
        nutritionInfo: JSON.stringify({
          calories: Math.floor(Math.random() * 800) + 200,
          protein: Math.floor(Math.random() * 30) + 10,
          carbs: Math.floor(Math.random() * 50) + 20,
          fat: Math.floor(Math.random() * 25) + 5,
        }),
      },
    })

    // Create base price (use direct create since we can't upsert with null platform)
    try {
      await prisma.prices.create({
        data: {
          productId: product.id,
          platformId: null, // Base price
          price: productData.basePrice,
          effectiveFrom: new Date('2024-01-01'),
        },
      })
    } catch (error) {
      // Price already exists, skip
    }

    // Create platform-specific prices (with markup)
    for (const platform of platforms.slice(0, 3)) { // Only for delivery platforms
      const markup = 1.15 // 15% markup for delivery platforms
      const platformPrice = Math.round(productData.basePrice * markup * 100) / 100

      try {
        await prisma.prices.create({
          data: {
            productId: product.id,
            platformId: platform.id,
            price: platformPrice,
            effectiveFrom: new Date('2024-01-01'),
          },
        })
      } catch (error) {
        // Price already exists, skip
      }

      // Create platform mapping
      await prisma.platform_mappings.upsert({
        where: {
          productId_platformId: {
            productId: product.id,
            platformId: platform.id,
          },
        },
        update: {},
        create: {
          productId: product.id,
          platformId: platform.id,
          externalId: `${platform.name.toLowerCase()}-${productData.sku}`,
          externalData: JSON.stringify({
            lastSyncAt: new Date(),
            syncStatus: 'synced',
          }),
        },
      })
    }
  }

  console.log(`✅ Created ${products.length} products with pricing`)

  // Create sample integrations
  const integrations = await Promise.all([
    prisma.integrations.upsert({
      where: {
        restaurantId_platformId: {
          restaurantId: restaurant.id,
          platformId: platforms[0].id, // Deliveroo
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        platformId: platforms[0].id,
        credentials: JSON.stringify({
          clientId: 'demo_client_id',
          clientSecret: 'demo_client_secret',
          accessToken: 'demo_access_token',
        }),
        settings: JSON.stringify({
          autoSync: true,
          syncInterval: 15,
          priceRounding: 'nearest_5',
          includeModifiers: true,
        }),
        status: 'CONNECTED',
        lastSyncAt: new Date(),
      },
    }),
    prisma.integrations.upsert({
      where: {
        restaurantId_platformId: {
          restaurantId: restaurant.id,
          platformId: platforms[1].id, // Uber Eats
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        platformId: platforms[1].id,
        credentials: JSON.stringify({
          clientId: 'demo_uber_client_id',
          clientSecret: 'demo_uber_client_secret',
          accessToken: 'demo_uber_access_token',
        }),
        settings: JSON.stringify({
          autoSync: true,
          syncInterval: 30,
          priceRounding: 'nearest_10',
          includeModifiers: false,
        }),
        status: 'CONNECTED',
        lastSyncAt: new Date(),
      },
    }),
  ])

  console.log(`✅ Created ${integrations.length} integrations`)

  // Create sample sync jobs
  for (const integration of integrations) {
    await prisma.sync_jobs.create({
      data: {
        integrationId: integration.id,
        restaurantId: restaurant.id,
        type: 'FULL',
        direction: 'PUSH',
        status: 'COMPLETED',
        progress: JSON.stringify({
          total: products.length,
          processed: products.length,
          failed: 0,
        }),
        startedAt: new Date(Date.now() - 60000), // 1 minute ago
        completedAt: new Date(),
        result: JSON.stringify({
          created: 0,
          updated: products.length,
          deleted: 0,
          errors: [],
        }),
      },
    })
  }

  console.log(`✅ Created sample sync jobs`)

  console.log('🎉 Seeding completed successfully!')
  console.log('\n📝 Demo credentials:')
  console.log('   Email: demo@tightship.com')
  console.log('   Password: demo123 (or any password for demo)')
  console.log(`   Organization: ${organization.name}`)
  console.log(`   Restaurant: ${restaurant.name}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
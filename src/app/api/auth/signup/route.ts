import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db as db } from '@/lib/db'
import { authRateLimit, shouldRateLimit } from '@/lib/ratelimit'
import { captureError, captureDatabaseError, ErrorCategory } from '@/lib/sentry'
import { StripeService } from '@/lib/services/stripe'

export async function POST(req: NextRequest) {
  let body: any
  try {
    // Apply rate limiting
    if (shouldRateLimit()) {
      const rateLimitResult = await authRateLimit(req)
      if (rateLimitResult) {
        return rateLimitResult
      }
    }

    body = await req.json()
    const { email, password, name, organizationName } = body

    // Check if user already exists
    const existingUser = await db.users.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Create organization with unique slug
    const baseSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    let slug = baseSlug
    let counter = 1
    
    // Check if slug exists and make it unique
    while (await db.organizations.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const organization = await db.organizations.create({
      data: {
        name: organizationName,
        slug,
        settings: {
          timezone: 'Europe/London',
          currency: 'GBP',
        },
      },
    })

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create user
    const user = await db.users.create({
      data: {
        email,
        name,
        password: hashedPassword, // Store the hashed password
        role: 'OWNER',
        organizationId: organization.id,
      },
    })

    // Create default restaurant
    const restaurant = await db.restaurants.create({
      data: {
        organizationId: organization.id,
        name: organizationName,
        settings: {
          autoSync: false,
        },
      },
    })

    // Create default menu
    const menu = await db.menus.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Main Menu',
        description: 'Default menu',
      },
    })

    // Create platforms (if they don't exist)
    const platformData = [
      { name: 'Deliveroo', type: 'DELIVERY' },
      { name: 'Uber Eats', type: 'DELIVERY' },
      { name: 'Just Eat', type: 'DELIVERY' },
    ]

    for (const platform of platformData) {
      await db.platforms.upsert({
        where: { name: platform.name },
        update: {},
        create: platform as any,
      })
    }

    // Create Stripe customer
    let stripeCustomer = null
    try {
      stripeCustomer = await StripeService.createCustomer({
        email,
        name,
        organizationId: organization.id,
        organizationName,
      })

      // Create free trial subscription
      await db.subscriptions.create({
        data: {
          organizationId: organization.id,
          plan: 'FREE',
          status: 'TRIALING',
          stripeCustomerId: stripeCustomer.id,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        },
      })
    } catch (stripeError) {
      // Log Stripe error but don't fail signup
      console.warn('Failed to create Stripe customer during signup:', stripeError)
      captureError(
        stripeError as Error,
        ErrorCategory.INTEGRATION,
        {
          operation: 'stripe_customer_creation',
          organizationId: organization.id,
          email,
        }
      )

      // Create free subscription without Stripe
      await db.subscriptions.create({
        data: {
          organizationId: organization.id,
          plan: 'FREE',
          status: 'TRIALING',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        },
      })
    }

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      stripeCustomerId: stripeCustomer?.id,
    })
  } catch (error) {
    // Capture error with context
    captureError(
      error as Error,
      ErrorCategory.AUTH,
      {
        operation: 'signup',
        email: body?.email,
      }
    )
    
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
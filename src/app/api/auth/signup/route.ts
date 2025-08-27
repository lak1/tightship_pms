import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { email, password, name, organizationName } = await req.json()

    // Check if user already exists
    const existingUser = await db.user.findUnique({
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
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const organization = await db.organization.create({
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
    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword, // Store the hashed password
        role: 'OWNER',
        organizationId: organization.id,
      },
    })

    // Create default restaurant
    const restaurant = await db.restaurant.create({
      data: {
        organizationId: organization.id,
        name: organizationName,
        settings: {
          autoSync: false,
        },
      },
    })

    // Create default menu
    const menu = await db.menu.create({
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
      await db.platform.upsert({
        where: { name: platform.name },
        update: {},
        create: platform as any,
      })
    }

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
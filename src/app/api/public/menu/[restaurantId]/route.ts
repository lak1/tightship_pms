import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { publicApiRateLimit, shouldRateLimit } from '@/lib/ratelimit'
import { StripeService } from '@/lib/services/stripe'

// Public API for fetching restaurant menu data
// Can be cached at CDN level for performance

const paramsSchema = z.object({
  restaurantId: z.string(),
})

const querySchema = z.object({
  apiKey: z.string().optional(),
  format: z.enum(['json', 'simple']).optional().default('json'),
  includeInactive: z.boolean().optional().default(false),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    // Apply rate limiting for public API
    if (shouldRateLimit()) {
      const rateLimitResult = await publicApiRateLimit(request)
      if (rateLimitResult) {
        return rateLimitResult
      }
    }

    // Validate params
    const { restaurantId } = paramsSchema.parse(await params)
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse({
      apiKey: searchParams.get('apiKey') || undefined,
      format: searchParams.get('format') || 'json',
      includeInactive: searchParams.get('includeInactive') === 'true',
    })

    // Optional: Implement API key validation for rate limiting
    // For now, we'll make it public but you could add authentication later
    
    // Fetch restaurant with menus and products
    const restaurant = await db.restaurants.findFirst({
      where: {
        id: restaurantId,
        isActive: true,
      },
      include: {
        menus: {
          where: {
            isActive: true,
          },
          include: {
            categories: {
              where: {
                isActive: query.includeInactive ? undefined : true,
              },
              orderBy: {
                displayOrder: 'asc',
              },
              include: {
                products: {
                  where: {
                    isActive: query.includeInactive ? undefined : true,
                  },
                  orderBy: {
                    name: 'asc',
                  },
                  include: {
                    tax_rates: true,
                    prices: {
                      where: {
                        effectiveTo: null,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Record API usage for billing (async, don't wait)
    StripeService.recordApiUsage(restaurant.organizationId).catch(error => {
      console.warn('Failed to record API usage:', error)
    })

    // Transform data based on format
    if (query.format === 'simple') {
      // Simple format matching the Pisces site structure
      const categories = restaurant.menus.flatMap(menu => 
        menu.categories.map(category => ({
          name: category.name,
          items: category.products.map(product => {
            const basePrice = parseFloat(product.basePrice.toString())
            const taxRate = product.tax_rates?.rate || 0
            const displayPrice = basePrice * (1 + parseFloat(taxRate.toString()))
            
            return {
              name: product.name,
              price: displayPrice.toFixed(2),
              description: product.description || undefined,
            }
          }),
        }))
      )

      return NextResponse.json(
        { 
          restaurant: restaurant.name,
          lastUpdated: new Date().toISOString(),
          categories 
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      )
    }

    // Full JSON format with all details
    return NextResponse.json(
      {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          timezone: restaurant.timezone,
        },
        menus: restaurant.menus.map(menu => ({
          id: menu.id,
          name: menu.name,
          description: menu.description,
          categories: menu.categories.map(category => ({
            id: category.id,
            name: category.name,
            description: category.description,
            products: category.products.map(product => {
              const basePrice = parseFloat(product.basePrice.toString())
              const taxRate = product.tax_rates?.rate || 0
              const displayPrice = basePrice * (1 + parseFloat(taxRate.toString()))
              
              return {
                id: product.id,
                name: product.name,
                description: product.description,
                sku: product.sku,
                basePrice: basePrice.toFixed(2),
                displayPrice: displayPrice.toFixed(2),
                taxRate: taxRate ? (parseFloat(taxRate.toString()) * 100).toFixed(0) + '%' : null,
                allergens: product.allergens,
                dietaryInfo: product.dietaryInfo,
              }
            }),
          })),
        })),
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Menu API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
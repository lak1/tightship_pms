import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const UK_ALLERGENS = [
  'Cereals containing gluten',
  'Crustaceans', 
  'Eggs',
  'Fish',
  'Peanuts',
  'Soybeans',
  'Milk',
  'Tree nuts',
  'Celery',
  'Mustard',
  'Sesame seeds',
  'Sulphites',
  'Lupin',
  'Molluscs',
]

export async function GET(
  request: NextRequest,
  { params }: { params: { restaurantId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { restaurantId } = params
    const { searchParams } = new URL(request.url)
    
    const format = searchParams.get('format') || 'json'
    const includeCategories = searchParams.get('includeCategories') === 'true'
    const includeMayContain = searchParams.get('includeMayContain') !== 'false' // Default true
    const productIds = searchParams.get('productIds')?.split(',').filter(Boolean)

    // Verify restaurant belongs to user's organization
    const restaurant = await db.restaurants.findFirst({
      where: {
        id: restaurantId,
        organizationId: session.user.organizationId,
      },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Get products
    const whereClause: any = {
      menus: {
        restaurants: {
          id: restaurantId,
          organizationId: session.user.organizationId,
        },
      },
      showOnMenu: true,
    }

    if (productIds && productIds.length > 0) {
      whereClause.id = { in: productIds }
    }

    const products = await db.products.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        allergens: true,
        mayContainAllergens: true,
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        includeCategories ? { categories: { name: 'asc' } } : { name: 'asc' },
        { name: 'asc' },
      ],
    })

    // Build matrix data
    const matrixData = products.map(product => {
      const allergenData: any = {
        productId: product.id,
        productName: product.name,
        category: product.categories?.name || 'Uncategorized',
      }

      // Add allergen columns
      UK_ALLERGENS.forEach(allergen => {
        const contains = product.allergens?.includes(allergen) || false
        const mayContain = includeMayContain && (product.mayContainAllergens?.includes(allergen) || false)
        
        if (contains && mayContain) {
          allergenData[allergen] = '✓ (✓)' // Contains and may contain
        } else if (contains) {
          allergenData[allergen] = '✓' // Contains only
        } else if (mayContain) {
          allergenData[allergen] = '(✓)' // May contain only
        } else {
          allergenData[allergen] = '' // None
        }
      })

      return allergenData
    })

    const response = {
      products: matrixData,
      allergens: UK_ALLERGENS,
      metadata: {
        restaurantId,
        restaurantName: restaurant.name,
        totalProducts: products.length,
        includeCategories,
        includeMayContain,
        generatedAt: new Date().toISOString(),
        compliance: 'UK SFBB and Natasha\'s Law',
      },
      legend: {
        contains: '✓ = Contains allergen (legally declared)',
        mayContain: '(✓) = May contain allergen (cross-contamination risk)',
        both: '✓ (✓) = Contains and may contain allergen',
      },
      disclaimer: 'All food is cooked in the same oil. Allergens in brackets may be present in the food. For further information please speak to a member of staff.',
    }

    if (format === 'csv') {
      // Generate CSV
      const csvRows = []
      
      // Headers
      const headers = ['Product', 'Category', ...UK_ALLERGENS]
      csvRows.push(headers.join(','))

      // Data rows
      matrixData.forEach(product => {
        const row = [
          `"${product.productName}"`,
          `"${product.category}"`,
          ...UK_ALLERGENS.map(allergen => `"${product[allergen] || ''}"`)
        ]
        csvRows.push(row.join(','))
      })

      const csvString = csvRows.join('\n')
      
      return new NextResponse(csvString, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="allergen-matrix-${restaurantId}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error generating allergen matrix:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
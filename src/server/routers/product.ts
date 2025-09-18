import { z } from 'zod'
import { createTRPCRouter, organizationProcedure, subscriptionProcedure, publicProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { transforms } from '@/lib/import-utils'
import { STANDARD_ALLERGENS, COMMON_DIETARY_INFO } from '@/lib/constants/allergens'
import { SubscriptionService } from '@/lib/subscriptions'

const nutritionalInfoSchema = z.object({
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbohydrates: z.number().optional(),
  fat: z.number().optional(),
  saturatedFat: z.number().optional(),
  sugar: z.number().optional(),
  fiber: z.number().optional(),
  sodium: z.number().optional(),
  cholesterol: z.number().optional(),
  calcium: z.number().optional(),
  iron: z.number().optional(),
  vitaminC: z.number().optional(),
  vitaminA: z.number().optional(),
  servingSize: z.string().optional(),
  servingUnit: z.string().optional(),
}).optional()

const createProductSchema = z.object({
  menuId: z.string(),
  categoryId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().min(0),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  taxRateId: z.string().optional(),
  priceControl: z.enum(['MANUAL', 'FORMULA', 'MARKET']).default('MANUAL'),
  priceFormula: z.string().optional(),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  mayContainAllergens: z.array(z.string()).default([]),
  dietaryInfo: z.array(z.string()).default([]),
  nutritionInfo: nutritionalInfoSchema,
  canBeModifier: z.boolean().default(false),
  showOnMenu: z.boolean().default(true),
  
  // Variant fields
  productType: z.enum(['STANDALONE', 'PARENT', 'VARIANT']).default('STANDALONE'),
  parentProductId: z.string().optional(),
  variantAttributes: z.record(z.string()).default({}),
  variantDisplayOrder: z.number().default(0),
})

const updateProductSchema = createProductSchema.partial().extend({
  id: z.string(),
  categoryId: z.string().nullable().optional(),
  customPrice: z.number().nullable().optional(),
})

export const productRouter = createTRPCRouter({
  getConstants: publicProcedure.query(() => {
    return {
      allergens: STANDARD_ALLERGENS,
      dietaryInfo: COMMON_DIETARY_INFO,
    }
  }),

  getTaxRates: organizationProcedure
    .input(z.object({
      restaurantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // For now, get all tax rates in the organization
      // In the future, we could filter by restaurant if needed
      return ctx.db.tax_rates.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      })
    }),

  getCategories: organizationProcedure
    .input(z.object({
      menuId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify menu belongs to user's organization
      const menu = await ctx.db.menus.findFirst({
        where: {
          id: input.menuId,
          restaurants: {
            organizationId: ctx.session.user.organizationId,
          },
        },
        include: {
          categories: {
            orderBy: {
              name: 'asc',
            },
          },
        },
      })

      if (!menu) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Menu not found',
        })
      }

      return menu.categories
    }),

  createCategory: organizationProcedure
    .input(z.object({
      menuId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify menu belongs to user's organization
      const menu = await ctx.db.menus.findFirst({
        where: {
          id: input.menuId,
          restaurants: {
            organizationId: ctx.session.user.organizationId,
          },
        },
      })

      if (!menu) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Menu not found',
        })
      }

      const category = await ctx.db.categories.create({
        data: {
          id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          menuId: input.menuId,
          name: input.name,
          description: input.description,
          displayOrder: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      return category
    }),

  list: organizationProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        search: z.string().optional(),
        categoryId: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { restaurantId, search, categoryId, page, limit } = input
      
      // Verify restaurant belongs to user's organization
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: restaurantId,
          organizationId: ctx.session.user.organizationId,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found',
        })
      }

      const where = {
        menus: {
          restaurantId,
        },
        ...(search && {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }),
        ...(categoryId && {
          categoryId,
        }),
        isActive: true,
      }

      const [products, total] = await Promise.all([
        ctx.db.products.findMany({
          where,
          include: {
            categories: true,
            tax_rates: true,
            prices: {
              where: {
                effectiveTo: null,
              },
              include: {
                platforms: true,
              },
            },
            // Include variant information
            parentProduct: {
              select: {
                id: true,
                name: true,
              },
            },
            variants: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                variantAttributes: true,
                variantDisplayOrder: true,
              },
              orderBy: [
                { variantDisplayOrder: 'asc' },
                { name: 'asc' },
              ],
            },
          },
          orderBy: {
            name: 'asc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.products.count({ where }),
      ])

      return {
        products,
        total,
        pages: Math.ceil(total / limit),
      }
    }),

  create: subscriptionProcedure({
      requireLimit: {
        type: 'products',
        amount: 1
      },
      allowTrial: true
    })
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify menu belongs to user's organization
      const menu = await ctx.db.menus.findFirst({
        where: {
          id: input.menuId,
          restaurants: {
            organizationId: ctx.session.user.organizationId,
          },
        },
      })

      if (!menu) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Menu not found',
        })
      }

      // Handle SKU - only include if not empty, otherwise let database handle null
      const productData: any = {
        ...input,
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        basePrice: input.basePrice.toString(),
        updatedAt: new Date(),
      }
      
      // Only include SKU if it's not empty
      if (!input.sku || input.sku.trim() === '') {
        delete productData.sku
      }
      
      // Only include barcode if it's not empty
      if (!input.barcode || input.barcode.trim() === '') {
        delete productData.barcode
      }

      const product = await ctx.db.products.create({
        data: productData,
        include: {
          categories: true,
          tax_rates: true,
        },
      })

      // Create base price record
      await ctx.db.prices.create({
        data: {
          id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId: product.id,
          price: input.basePrice.toString(),
          effectiveFrom: new Date(),
          updatedAt: new Date(),
        },
      })

      return product
    }),

  update: organizationProcedure
    .input(updateProductSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Verify product belongs to user's organization
      const existingProduct = await ctx.db.products.findFirst({
        where: {
          id,
          menus: {
            restaurants: {
              organizationId: ctx.session.user.organizationId,
            },
          },
        },
      })

      if (!existingProduct) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      // Handle composite product pricing logic
      const updateData: any = { ...data }
      
      // Convert basePrice to string if provided
      if (data.basePrice !== undefined) {
        updateData.basePrice = data.basePrice.toString()
      }
      
      // Handle customPrice for composite products
      if (data.customPrice !== undefined) {
        updateData.customPrice = data.customPrice
      }
      
      // Handle SKU - only include if not empty, otherwise exclude to set null
      if (!data.sku || data.sku.trim() === '') {
        updateData.sku = null
      }
      
      // Handle barcode - only include if not empty, otherwise exclude to set null
      if (!data.barcode || data.barcode.trim() === '') {
        updateData.barcode = null
      }
      
      // If this is a composite product and customPrice is being cleared, recalculate from components
      if (existingProduct.isComposite && data.customPrice === null) {
        // Recalculate total from components
        const components = await ctx.db.composite_components.findMany({
          where: { compositeId: id },
          include: {
            component_product: {
              select: { basePrice: true },
            },
          },
        })
        
        let totalPrice = 0
        for (const component of components) {
          const componentPrice = component.customPrice || Number(component.component_product.basePrice)
          totalPrice += componentPrice * component.quantity
        }
        
        updateData.basePrice = totalPrice.toString()
      }

      const product = await ctx.db.products.update({
        where: { id },
        data: updateData,
        include: {
          categories: true,
          tax_rates: true,
        },
      })

      // Trigger Google sync if integration exists and price changed
      if (data.basePrice && data.basePrice !== Number(existingProduct.basePrice)) {
        const googleIntegration = await ctx.db.google_integrations.findFirst({
          where: {
            restaurants: {
              menus: {
                some: { id: existingProduct.menuId }
              }
            },
            isActive: true,
            autoSync: true
          }
        })

        if (googleIntegration) {
          // Queue sync job (in production, use a job queue)
          const { queueGoogleMenuSync } = await import('@/lib/google/menuSync')
          await queueGoogleMenuSync(googleIntegration.id, 'PRICE_CHANGE')
        }

        // Trigger price push to delivery platforms
        try {
          const { syncRouter } = await import('./sync')
          const syncService = syncRouter.createCaller({
            session: ctx.session,
            db: ctx.db,
            req: ctx.req,
            resHeaders: ctx.resHeaders
          })

          // Trigger price push (non-blocking)
          syncService.triggerPricePush({
            productId: id,
            oldPrice: Number(existingProduct.basePrice),
            newPrice: data.basePrice,
          }).catch(error => {
            console.error('Failed to trigger price push:', error)
            // Don't throw error to avoid breaking product update
          })
        } catch (error) {
          console.error('Failed to trigger price push:', error)
          // Don't throw error to avoid breaking product update
        }
      }

      // If base price changed, create new price record
      if (data.basePrice && data.basePrice !== Number(existingProduct.basePrice)) {
        // Close current base price
        await ctx.db.prices.updateMany({
          where: {
            productId: id,
            platformId: null,
            effectiveTo: null,
          },
          data: {
            effectiveTo: new Date(),
          },
        })

        // Create new base price
        await ctx.db.prices.create({
          data: {
            id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productId: id,
            price: data.basePrice.toString(),
            effectiveFrom: new Date(),
            updatedAt: new Date(),
          },
        })
      }

      return product
    }),

  updatePrice: organizationProcedure
    .input(
      z.object({
        productId: z.string(),
        platformId: z.string().optional(),
        price: z.number().min(0),
        effectiveFrom: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { productId, platformId, price, effectiveFrom } = input

      // Verify product belongs to user's organization
      const product = await ctx.db.products.findFirst({
        where: {
          id: productId,
          menus: {
            restaurants: {
              organizationId: ctx.session.user.organizationId,
            },
          },
        },
      })

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      const effectiveDate = effectiveFrom || new Date()

      // Close current price for this platform
      await ctx.db.prices.updateMany({
        where: {
          productId,
          platformId: platformId || null,
          effectiveTo: null,
        },
        data: {
          effectiveTo: effectiveDate,
        },
      })

      // Create new price record
      const newPrice = await ctx.db.prices.create({
        data: {
          id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId,
          platformId: platformId || null,
          price: price.toString(),
          effectiveFrom: effectiveDate,
          updatedAt: new Date(),
        },
      })

      // Create price history record
      await ctx.db.price_history.create({
        data: {
          id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId,
          platformId,
          oldPrice: product.basePrice,
          newPrice: price.toString(),
          changeReason: 'Manual update',
          changedBy: ctx.session.user.id,
        },
      })

      return newPrice
    }),

  getById: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.products.findFirst({
        where: {
          id: input.id,
          menus: {
            restaurants: {
              organizationId: ctx.session.user.organizationId,
            },
          },
        },
        include: {
          categories: true,
          tax_rates: true,
          menus: {
            include: {
              restaurants: true,
            },
          },
          prices: {
            where: {
              effectiveTo: null,
            },
            include: {
              platforms: true,
            },
          },
          price_history: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
        },
      })

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      return product
    }),

  delete: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify product belongs to user's organization
      const product = await ctx.db.products.findFirst({
        where: {
          id: input.id,
          menus: {
            restaurants: {
              organizationId: ctx.session.user.organizationId,
            },
          },
        },
      })

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      // Soft delete by marking as inactive
      await ctx.db.products.update({
        where: { id: input.id },
        data: { isActive: false },
      })

      return { success: true }
    }),

  importProducts: organizationProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        menuId: z.string(),
        products: z.array(
          z.object({
            name: z.string(),
            category: z.string().optional(),
            basePrice: z.number().optional(),
            description: z.string().optional(),
            sku: z.string().optional(),
            barcode: z.string().optional(),
            ingredients: z.array(z.string()).optional(),
            allergens: z.array(z.string()).optional(),
            dietaryInfo: z.array(z.string()).optional(),
            nutritionInfo: nutritionalInfoSchema,
            active: z.boolean().optional(),
            deliverooPrice: z.number().optional(),
            uberPrice: z.number().optional(),
            justeatPrice: z.number().optional(),
            taxRateId: z.string().optional(),
          })
        ),
        options: z.object({
          updateExisting: z.boolean().default(false),
          createCategories: z.boolean().default(true),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { restaurantId, menuId, products, options } = input

      // Check subscription limits for bulk import
      const { SubscriptionService } = await import('@/lib/subscriptions')
      const organizationId = ctx.session.user.organizationId

      // Count products to be created (not updated)
      let productsToCreate = products.length
      if (options.updateExisting) {
        // For bulk import, we need to pre-check how many are actually new
        const existingSkus = products.map(p => p.sku).filter((sku): sku is string => Boolean(sku))
        const existingProducts = await ctx.db.products.findMany({
          where: {
            sku: { in: existingSkus }
          },
          select: { sku: true }
        })
        const existingSkuSet = new Set(existingProducts.map(p => p.sku))
        productsToCreate = products.filter(p => !p.sku || !existingSkuSet.has(p.sku)).length
      }

      const limitCheck = await SubscriptionService.checkLimit(
        organizationId,
        'products',
        productsToCreate
      )

      if (!limitCheck.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Cannot import ${productsToCreate} products. ${limitCheck.message || 'Usage limit exceeded'}`,
          cause: {
            currentUsage: limitCheck.currentUsage,
            limit: limitCheck.limit,
            requestedAmount: productsToCreate,
            upgradeUrl: '/billing'
          }
        })
      }

      // Verify restaurant and menu belong to user's organization
      const menu = await ctx.db.menus.findFirst({
        where: {
          id: menuId,
          restaurantId,
          restaurants: {
            organizationId: ctx.session.user.organizationId,
          },
        },
      })

      if (!menu) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Menu not found',
        })
      }

      // Get or create categories
      const categoryMap = new Map<string, string>()
      
      if (options.createCategories) {
        const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))]
        
        for (const categoryName of uniqueCategories) {
          if (!categoryName) continue
          
          // Check if category exists
          let category = await ctx.db.categories.findFirst({
            where: {
              menuId,
              name: categoryName,
            },
          })
          
          // Create if not exists
          if (!category) {
            category = await ctx.db.categories.create({
              data: {
                id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                menuId,
                name: categoryName,
                displayOrder: categoryMap.size,
                updatedAt: new Date(),
              },
            })
          }
          
          categoryMap.set(categoryName, category.id)
        }
      }

      // Get platform IDs for price creation
      const platforms = await ctx.db.platforms.findMany({
        where: {
          name: {
            in: ['Deliveroo', 'Uber Eats', 'Just Eat'],
          },
        },
      })

      const platformMap = new Map(platforms.map(p => [p.name, p.id]))

      // Import products
      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as { product: string; error: string }[],
      }

      for (const productData of products) {
        try {
          // Check if product exists (by SKU if provided, otherwise by name)
          let existingProduct = null
          
          if (productData.sku) {
            existingProduct = await ctx.db.products.findUnique({
              where: { sku: productData.sku },
            })
          } else if (options.updateExisting) {
            existingProduct = await ctx.db.products.findFirst({
              where: {
                menuId,
                name: productData.name,
              },
            })
          }

          if (existingProduct && !options.updateExisting) {
            results.skipped++
            continue
          }

          const categoryId = productData.category 
            ? categoryMap.get(productData.category) 
            : undefined

          const productPayload = {
            id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            menuId,
            categoryId,
            name: productData.name,
            description: productData.description,
            basePrice: (productData.basePrice || 0).toString(),
            sku: productData.sku,
            barcode: productData.barcode,
            ingredients: productData.ingredients || [],
            allergens: productData.allergens || [],
            dietaryInfo: productData.dietaryInfo || [],
            nutritionInfo: productData.nutritionInfo || null,
            isActive: productData.active !== false,
            taxRateId: productData.taxRateId || null,
            updatedAt: new Date(),
          }

          let product
          
          if (existingProduct) {
            // Update existing product
            product = await ctx.db.products.update({
              where: { id: existingProduct.id },
              data: productPayload,
            })
            results.updated++
          } else {
            // Create new product
            product = await ctx.db.products.create({
              data: productPayload,
            })
            results.created++
          }

          // Create price records
          const pricesToCreate = []

          // Base price
          if (productData.basePrice) {
            pricesToCreate.push({
              id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              productId: product.id,
              price: productData.basePrice.toString(),
              effectiveFrom: new Date(),
              updatedAt: new Date(),
            })
          }

          // Platform prices
          if (productData.deliverooPrice && platformMap.has('Deliveroo')) {
            pricesToCreate.push({
              id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              productId: product.id,
              platformId: platformMap.get('Deliveroo'),
              price: productData.deliverooPrice.toString(),
              effectiveFrom: new Date(),
              updatedAt: new Date(),
            })
          }

          if (productData.uberPrice && platformMap.has('Uber Eats')) {
            pricesToCreate.push({
              id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              productId: product.id,
              platformId: platformMap.get('Uber Eats'),
              price: productData.uberPrice.toString(),
              effectiveFrom: new Date(),
              updatedAt: new Date(),
            })
          }

          if (productData.justeatPrice && platformMap.has('Just Eat')) {
            pricesToCreate.push({
              id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              productId: product.id,
              platformId: platformMap.get('Just Eat'),
              price: productData.justeatPrice.toString(),
              effectiveFrom: new Date(),
              updatedAt: new Date(),
            })
          }

          if (pricesToCreate.length > 0) {
            // Close existing prices
            await ctx.db.prices.updateMany({
              where: {
                productId: product.id,
                effectiveTo: null,
              },
              data: {
                effectiveTo: new Date(),
              },
            })

            // Create new prices
            await ctx.db.prices.createMany({
              data: pricesToCreate,
            })
          }

        } catch (error) {
          results.errors.push({
            product: productData.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return results
    }),

  // Composite Product Management
  createComposite: subscriptionProcedure({
      requireLimit: {
        type: 'products',
        amount: 1
      },
      allowTrial: true
    })
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        menuId: z.string(),
        categoryId: z.string().optional(),
        taxRateId: z.string().optional(),
        components: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().min(1).default(1),
            customPrice: z.number().optional(), // Override component price
          })
        ),
        customPrice: z.number().optional(), // Set custom total price instead of sum of components
        sku: z.string().optional(),
        barcode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, description, menuId, categoryId, taxRateId, components, customPrice, sku, barcode } = input

      // Calculate total price from components if no custom price set
      let totalPrice = customPrice || 0
      if (!customPrice) {
        for (const component of components) {
          const product = await ctx.db.products.findUnique({
            where: { id: component.productId },
            select: { basePrice: true }
          })
          if (product) {
            const componentPrice = component.customPrice || Number(product.basePrice)
            totalPrice += componentPrice * component.quantity
          }
        }
      }

      // Create the composite product
      // Handle SKU and barcode for composite products
      const compositeData: any = {
        id: `composite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        menuId,
        categoryId,
        taxRateId,
        basePrice: totalPrice.toString(),
        isComposite: true,
        customPrice,
        updatedAt: new Date(),
      }
      
      // Only include SKU if not empty
      if (sku && sku.trim() !== '') {
        compositeData.sku = sku
      }
      
      // Only include barcode if not empty
      if (barcode && barcode.trim() !== '') {
        compositeData.barcode = barcode
      }

      const compositeProduct = await ctx.db.products.create({
        data: compositeData,
      })

      // Create component relationships
      for (const [index, component] of components.entries()) {
        await ctx.db.composite_components.create({
          data: {
            id: `comp_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            compositeId: compositeProduct.id,
            componentId: component.productId,
            quantity: component.quantity,
            customPrice: component.customPrice,
            displayOrder: index,
          },
        })
      }

      return compositeProduct
    }),

  getCompositeComponents: organizationProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const components = await ctx.db.composite_components.findMany({
        where: { compositeId: input.productId },
        include: {
          component_product: {
            select: {
              id: true,
              name: true,
              basePrice: true,
              sku: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      })

      return components
    }),

  updateComposite: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        categoryId: z.string().optional(),
        taxRateId: z.string().optional(),
        components: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().min(1).default(1),
            customPrice: z.number().optional(),
          })
        ).optional(),
        customPrice: z.number().optional(),
        sku: z.string().optional(),
        barcode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, components, customPrice, ...updateData } = input

      // Update the composite product
      let totalPrice = customPrice
      if (components && !customPrice) {
        // Recalculate total price from components
        totalPrice = 0
        for (const component of components) {
          const product = await ctx.db.products.findUnique({
            where: { id: component.productId },
            select: { basePrice: true }
          })
          if (product) {
            const componentPrice = component.customPrice || Number(product.basePrice)
            totalPrice += componentPrice * component.quantity
          }
        }
      }

      const updatedProduct = await ctx.db.products.update({
        where: { id },
        data: {
          ...updateData,
          ...(totalPrice !== undefined && { basePrice: totalPrice }),
          ...(customPrice !== undefined && { customPrice }),
        },
      })

      // Update components if provided
      if (components) {
        // Delete existing components
        await ctx.db.composite_components.deleteMany({
          where: { compositeId: id },
        })

        // Create new components
        for (const [index, component] of components.entries()) {
          await ctx.db.composite_components.create({
            data: {
              id: `comp_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
              compositeId: id,
              componentId: component.productId,
              quantity: component.quantity,
              customPrice: component.customPrice,
              displayOrder: index,
            },
          })
        }
      }

      return updatedProduct
    }),

  // Product Modifier Management
  addModifier: organizationProcedure
    .input(
      z.object({
        productId: z.string(),
        modifierId: z.string(),
        modifierPrice: z.number().optional(), // Optional custom price override
        displayOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { productId, modifierId, modifierPrice, displayOrder } = input

      const modifier = await ctx.db.product_simple_modifiers.create({
        data: {
          id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId,
          modifierId,
          priceChange: 0, // Keep for backward compatibility
          modifierPrice: modifierPrice ? modifierPrice.toString() : null,
          displayOrder,
        },
      })

      return modifier
    }),

  getProductModifiers: organizationProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const modifiers = await ctx.db.product_simple_modifiers.findMany({
        where: { productId: input.productId, isActive: true },
        include: {
          modifier: {
            select: {
              id: true,
              name: true,
              basePrice: true,
              sku: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      })

      return modifiers
    }),

  removeModifier: organizationProcedure
    .input(
      z.object({
        productId: z.string(),
        modifierId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.product_simple_modifiers.deleteMany({
        where: {
          productId: input.productId,
          modifierId: input.modifierId,
        },
      })

      return { success: true }
    }),

  updateModifier: organizationProcedure
    .input(
      z.object({
        productId: z.string(),
        modifierId: z.string(),
        modifierPrice: z.number().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { productId, modifierId, modifierPrice, ...updateData } = input

      const updatedModifier = await ctx.db.product_simple_modifiers.updateMany({
        where: {
          productId,
          modifierId,
        },
        data: {
          ...updateData,
          modifierPrice: modifierPrice !== undefined ? modifierPrice.toString() : undefined,
        },
      })

      return updatedModifier
    }),

  updateComponentQuantity: organizationProcedure
    .input(
      z.object({
        compositeId: z.string(),
        componentId: z.string(),
        quantity: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { compositeId, componentId, quantity } = input

      // Update the component quantity
      const updatedComponent = await ctx.db.composite_components.updateMany({
        where: {
          compositeId,
          componentId,
        },
        data: {
          quantity,
        },
      })

      // Recalculate total price if the composite doesn't have a custom price
      const composite = await ctx.db.products.findUnique({
        where: { id: compositeId },
        select: { customPrice: true },
      })

      if (!composite?.customPrice) {
        // Recalculate total from all components
        const components = await ctx.db.composite_components.findMany({
          where: { compositeId },
          include: {
            component_product: {
              select: { basePrice: true },
            },
          },
        })

        let totalPrice = 0
        for (const component of components) {
          const componentPrice = component.customPrice || Number(component.component_product.basePrice)
          totalPrice += componentPrice * component.quantity
        }

        await ctx.db.products.update({
          where: { id: compositeId },
          data: { basePrice: totalPrice.toString() },
        })
      }

      return updatedComponent
    }),

  // Product Variant Management
  createVariant: subscriptionProcedure({
      requireLimit: {
        type: 'products',
        amount: 1
      },
      allowTrial: true
    })
    .input(
      z.object({
        parentProductId: z.string(),
        name: z.string(),
        basePrice: z.number().min(0),
        variantAttributes: z.record(z.string()).default({}), // { size: "Large", etc }
        sku: z.string().optional(),
        barcode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { parentProductId, ...variantData } = input

      // Verify parent product exists and belongs to organization
      const parentProduct = await ctx.db.products.findFirst({
        where: {
          id: parentProductId,
          menus: {
            restaurants: {
              organizationId: ctx.session.user.organizationId,
            },
          },
        },
        include: {
          menus: true,
        },
      })

      if (!parentProduct) {
        throw new Error('Parent product not found')
      }

      // Check variant limits for this subscription plan
      const variantLimitCheck = await SubscriptionService.checkVariantLimit(
        ctx.session.user.organizationId,
        parentProductId,
        1
      )

      if (!variantLimitCheck.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: variantLimitCheck.message || 'Variant limit exceeded for your subscription plan'
        })
      }

      // Create variant product
      // Handle SKU and barcode for variants
      const variantPayload: any = {
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        menuId: parentProduct.menuId,
        categoryId: parentProduct.categoryId,
        taxRateId: parentProduct.taxRateId,
        name: variantData.name,
        description: parentProduct.description,
        images: parentProduct.images,
        basePrice: variantData.basePrice.toString(),
          
        // Inherit from parent
        ingredients: parentProduct.ingredients,
        allergens: parentProduct.allergens,
          mayContainAllergens: parentProduct.mayContainAllergens,
        dietaryInfo: parentProduct.dietaryInfo,
        nutritionInfo: parentProduct.nutritionInfo,
        priceControl: parentProduct.priceControl,
        priceFormula: parentProduct.priceFormula,
        canBeModifier: parentProduct.canBeModifier,
        showOnMenu: parentProduct.showOnMenu,
        availability: parentProduct.availability,
        
        // Variant-specific
        productType: 'VARIANT',
        parentProductId: parentProductId,
        variantAttributes: variantData.variantAttributes,
        variantDisplayOrder: 0,
        updatedAt: new Date(),
      }
      
      // Only include SKU if not empty
      if (variantData.sku && variantData.sku.trim() !== '') {
        variantPayload.sku = variantData.sku
      }
      
      // Only include barcode if not empty
      if (variantData.barcode && variantData.barcode.trim() !== '') {
        variantPayload.barcode = variantData.barcode
      }

      const variant = await ctx.db.products.create({
        data: variantPayload,
        include: {
          categories: true,
          tax_rates: true,
          parentProduct: true,
        },
      })

      // If this is the first variant, convert parent to PARENT type
      const variantCount = await ctx.db.products.count({
        where: { parentProductId: parentProductId },
      })

      if (variantCount === 1) {
        await ctx.db.products.update({
          where: { id: parentProductId },
          data: { 
            productType: 'PARENT',
            showOnMenu: false, // Hide parent from menu, show variants instead
          },
        })
      }

      return variant
    }),

  listVariants: organizationProcedure
    .input(
      z.object({
        parentProductId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const variants = await ctx.db.products.findMany({
        where: {
          parentProductId: input.parentProductId,
          menus: {
            restaurants: {
              organizationId: ctx.session.user.organizationId,
            },
          },
        },
        include: {
          categories: true,
          tax_rates: true,
          parentProduct: true,
        },
        orderBy: [
          { variantDisplayOrder: 'asc' },
          { name: 'asc' },
        ],
      })

      return variants
    }),

  convertToParent: organizationProcedure
    .input(
      z.object({
        productId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Convert a standalone product to a parent product
      const product = await ctx.db.products.findFirst({
        where: {
          id: input.productId,
          menus: {
            restaurants: {
              organizationId: ctx.session.user.organizationId,
            },
          },
        },
      })

      if (!product) {
        throw new Error('Product not found')
      }

      if (product.productType !== 'STANDALONE') {
        throw new Error('Product is already part of variant system')
      }

      const updatedProduct = await ctx.db.products.update({
        where: { id: input.productId },
        data: {
          productType: 'PARENT',
          showOnMenu: false, // Parent products are templates, not shown on menu
        },
        include: {
          categories: true,
          tax_rates: true,
          variants: true,
        },
      })

      return updatedProduct
    }),

  generateAllergenMatrix: organizationProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        productIds: z.array(z.string()).optional(),
        includeCategories: z.boolean().default(true),
        includeMayContain: z.boolean().default(true),
        format: z.enum(['json', 'csv']).default('json'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { restaurantId, productIds, includeCategories, includeMayContain } = input

      // Get products - prioritize parent products for variants
      const whereClause: any = {
        menus: {
          restaurants: {
            id: restaurantId,
            organizationId: ctx.session.user.organizationId,
          },
        },
        OR: [
          { productType: 'PARENT' },    // Show parent products
          { productType: 'STANDALONE' }, // Show standalone products
          { 
            productType: 'VARIANT',
            parentProductId: null       // Only show variants without parent (orphaned)
          }
        ],
      }

      if (productIds && productIds.length > 0) {
        whereClause.id = { in: productIds }
      }

      const products = await ctx.db.products.findMany({
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

      // UK mandatory allergens in standard order
      const ukAllergens = [
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

      // Build matrix data
      const matrixData = products.map(product => {
        const allergenData: any = {
          productId: product.id,
          productName: product.name,
          category: product.categories?.name || 'Uncategorized',
        }

        // Add allergen columns
        ukAllergens.forEach(allergen => {
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

      return {
        products: matrixData,
        allergens: ukAllergens,
        metadata: {
          totalProducts: products.length,
          includeCategories,
          includeMayContain,
          generatedAt: new Date().toISOString(),
          restaurantId,
          compliance: 'UK SFBB and Natasha\'s Law',
        },
        legend: {
          contains: '✓ = Contains allergen (legally declared)',
          mayContain: '(✓) = May contain allergen (cross-contamination risk)',
          both: '✓ (✓) = Contains and may contain allergen',
        },
        disclaimer: 'All food is cooked in the same oil. Allergens in brackets may be present in the food. For further information please speak to a member of staff.',
      }
    }),
})
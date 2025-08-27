import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { transforms } from '@/lib/import-utils'

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
  allergens: z.array(z.string()).default([]),
  dietaryInfo: z.array(z.string()).default([]),
})

const updateProductSchema = createProductSchema.partial().extend({
  id: z.string(),
})

export const productRouter = createTRPCRouter({
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

  create: organizationProcedure
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

      const product = await ctx.db.products.create({
        data: {
          ...input,
          basePrice: input.basePrice.toString(),
        },
        include: {
          categories: true,
          tax_rates: true,
        },
      })

      // Create base price record
      await ctx.db.prices.create({
        data: {
          productId: product.id,
          price: input.basePrice.toString(),
          effectiveFrom: new Date(),
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

      const product = await ctx.db.products.update({
        where: { id },
        data: {
          ...data,
          ...(data.basePrice && {
            basePrice: data.basePrice.toString(),
          }),
        },
        include: {
          categories: true,
          tax_rates: true,
        },
      })

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
            productId: id,
            price: data.basePrice.toString(),
            effectiveFrom: new Date(),
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
          productId,
          platformId: platformId || null,
          price: price.toString(),
          effectiveFrom: effectiveDate,
        },
      })

      // Create price history record
      await ctx.db.price_history.create({
        data: {
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
            allergens: z.array(z.string()).optional(),
            dietaryInfo: z.array(z.string()).optional(),
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
                menuId,
                name: categoryName,
                displayOrder: categoryMap.size,
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
            menuId,
            categoryId,
            name: productData.name,
            description: productData.description,
            basePrice: (productData.basePrice || 0).toString(),
            sku: productData.sku,
            barcode: productData.barcode,
            allergens: productData.allergens || [],
            dietaryInfo: productData.dietaryInfo || [],
            isActive: productData.active !== false,
            taxRateId: productData.taxRateId || null,
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
              productId: product.id,
              price: productData.basePrice.toString(),
              effectiveFrom: new Date(),
            })
          }

          // Platform prices
          if (productData.deliverooPrice && platformMap.has('Deliveroo')) {
            pricesToCreate.push({
              productId: product.id,
              platformId: platformMap.get('Deliveroo'),
              price: productData.deliverooPrice.toString(),
              effectiveFrom: new Date(),
            })
          }

          if (productData.uberPrice && platformMap.has('Uber Eats')) {
            pricesToCreate.push({
              productId: product.id,
              platformId: platformMap.get('Uber Eats'),
              price: productData.uberPrice.toString(),
              effectiveFrom: new Date(),
            })
          }

          if (productData.justeatPrice && platformMap.has('Just Eat')) {
            pricesToCreate.push({
              productId: product.id,
              platformId: platformMap.get('Just Eat'),
              price: productData.justeatPrice.toString(),
              effectiveFrom: new Date(),
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
})
import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'
import { createLoyverseClient } from '@/lib/integrations/loyverse/client'
import type { LoyverseItem, LoyverseCategory } from '@/lib/integrations/loyverse/types'
import { TRPCError } from '@trpc/server'

/**
 * Loyverse Integration Router
 * Handles product import, category sync, price sync, and two-way data sync
 */
export const loyverseRouter = createTRPCRouter({
  /**
   * Get sync history for a restaurant's Loyverse integration
   */
  getSyncHistory: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify restaurant belongs to organization
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId,
          isActive: true,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found or access denied',
        })
      }

      // Get Loyverse integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'loyverse',
          },
        },
      })

      if (!integration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Loyverse integration not found',
        })
      }

      // Get sync jobs
      const syncJobs = await ctx.db.sync_jobs.findMany({
        where: {
          integrationId: integration.id,
          restaurantId: input.restaurantId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit,
      })

      return syncJobs.map(job => ({
        id: job.id,
        type: job.type,
        direction: job.direction,
        status: job.status,
        progress: job.progress,
        result: job.result,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        duration: job.startedAt && job.completedAt
          ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)
          : null,
      }))
    }),

  /**
   * Import categories from Loyverse
   */
  importCategories: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      menuId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify restaurant and menu
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId,
          isActive: true,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found or access denied',
        })
      }

      const menu = await ctx.db.menus.findFirst({
        where: {
          id: input.menuId,
          restaurantId: input.restaurantId,
          isActive: true,
        },
      })

      if (!menu) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Menu not found',
        })
      }

      // Get integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'loyverse',
          },
        },
      })

      if (!integration || integration.status !== 'CONNECTED') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Loyverse integration not connected',
        })
      }

      // Create sync job
      const syncJob = await ctx.db.sync_jobs.create({
        data: {
          id: `loyverse_categories_${Date.now()}_${input.restaurantId}`,
          integrationId: integration.id,
          restaurantId: input.restaurantId,
          type: 'FULL',
          direction: 'PULL',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          progress: {
            step: 'fetching_categories',
            categoriesFetched: 0,
            categoriesCreated: 0,
          },
        },
      })

      try {
        // Create Loyverse client
        const client = await createLoyverseClient(input.restaurantId)
        if (!client) {
          throw new Error('Failed to create Loyverse client')
        }

        // Fetch categories from Loyverse
        const loyverseCategories = await client.paginate<LoyverseCategory>('/categories')

        // Update progress
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            progress: {
              step: 'creating_categories',
              categoriesFetched: loyverseCategories.length,
              categoriesCreated: 0,
            },
          },
        })

        // Create categories in our database
        let createdCount = 0
        const categoryMapping: Record<string, string> = {}

        // First pass: Create categories without parents
        for (const loyverseCat of loyverseCategories) {
          const category = await ctx.db.categories.create({
            data: {
              id: `cat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              menuId: input.menuId,
              name: loyverseCat.name,
              displayOrder: createdCount,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })

          categoryMapping[loyverseCat.id] = category.id
          createdCount++
        }

        // Complete the sync job
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: {
              categoriesImported: createdCount,
              totalCategories: loyverseCategories.length,
              success: true,
            },
            progress: {
              step: 'completed',
              categoriesFetched: loyverseCategories.length,
              categoriesCreated: createdCount,
            },
          },
        })

        // Update integration last sync time
        await ctx.db.integrations.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
          },
        })

        return {
          success: true,
          jobId: syncJob.id,
          categoriesImported: createdCount,
          message: `Successfully imported ${createdCount} categories from Loyverse`,
        }
      } catch (error) {
        // Mark sync job as failed
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to import categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Import products from Loyverse
   */
  importProducts: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      menuId: z.string(),
      importImages: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify restaurant and menu
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId,
          isActive: true,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found or access denied',
        })
      }

      const menu = await ctx.db.menus.findFirst({
        where: {
          id: input.menuId,
          restaurantId: input.restaurantId,
          isActive: true,
        },
      })

      if (!menu) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Menu not found',
        })
      }

      // Get integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'loyverse',
          },
        },
      })

      if (!integration || integration.status !== 'CONNECTED') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Loyverse integration not connected',
        })
      }

      // Create sync job
      const syncJob = await ctx.db.sync_jobs.create({
        data: {
          id: `loyverse_products_${Date.now()}_${input.restaurantId}`,
          integrationId: integration.id,
          restaurantId: input.restaurantId,
          type: 'FULL',
          direction: 'PULL',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          progress: {
            step: 'fetching_products',
            productsFetched: 0,
            productsCreated: 0,
          },
        },
      })

      try {
        // Create Loyverse client
        const client = await createLoyverseClient(input.restaurantId)
        if (!client) {
          throw new Error('Failed to create Loyverse client')
        }

        // Fetch products from Loyverse
        const loyverseItems = await client.paginate<LoyverseItem>('/items')

        // Update progress
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            progress: {
              step: 'creating_products',
              productsFetched: loyverseItems.length,
              productsCreated: 0,
            },
          },
        })

        let createdCount = 0
        let updatedCount = 0

        // Create or update products
        for (const loyverseItem of loyverseItems) {
          // Check if product already exists (by SKU or barcode)
          const existingProduct = await ctx.db.products.findFirst({
            where: {
              menuId: input.menuId,
              OR: [
                { sku: loyverseItem.sku || undefined },
                { barcode: loyverseItem.barcode || undefined },
              ],
            },
          })

          const productData = {
            name: loyverseItem.item_name,
            description: loyverseItem.description || '',
            basePrice: loyverseItem.price,
            sku: loyverseItem.sku || null,
            barcode: loyverseItem.barcode || null,
            images: input.importImages && loyverseItem.image_url ? [loyverseItem.image_url] : [],
            isActive: true,
            updatedAt: new Date(),
          }

          if (existingProduct) {
            // Update existing product
            await ctx.db.products.update({
              where: { id: existingProduct.id },
              data: productData,
            })

            // Update or create platform mapping
            await ctx.db.platform_mappings.upsert({
              where: {
                productId_platformId: {
                  productId: existingProduct.id,
                  platformId: 'loyverse',
                },
              },
              create: {
                id: `mapping_${Date.now()}_${existingProduct.id}`,
                productId: existingProduct.id,
                platformId: 'loyverse',
                externalId: loyverseItem.id,
                externalData: loyverseItem,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              update: {
                externalId: loyverseItem.id,
                externalData: loyverseItem,
                updatedAt: new Date(),
              },
            })

            updatedCount++
          } else {
            // Create new product
            const newProduct = await ctx.db.products.create({
              data: {
                id: `prod_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                menuId: input.menuId,
                ...productData,
                createdAt: new Date(),
              },
            })

            // Create platform mapping
            await ctx.db.platform_mappings.create({
              data: {
                id: `mapping_${Date.now()}_${newProduct.id}`,
                productId: newProduct.id,
                platformId: 'loyverse',
                externalId: loyverseItem.id,
                externalData: loyverseItem,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            })

            createdCount++
          }

          // Update progress every 10 items
          if ((createdCount + updatedCount) % 10 === 0) {
            await ctx.db.sync_jobs.update({
              where: { id: syncJob.id },
              data: {
                progress: {
                  step: 'creating_products',
                  productsFetched: loyverseItems.length,
                  productsCreated: createdCount,
                  productsUpdated: updatedCount,
                },
              },
            })
          }
        }

        // Complete the sync job
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: {
              productsCreated: createdCount,
              productsUpdated: updatedCount,
              totalProducts: loyverseItems.length,
              success: true,
            },
            progress: {
              step: 'completed',
              productsFetched: loyverseItems.length,
              productsCreated: createdCount,
              productsUpdated: updatedCount,
            },
          },
        })

        // Update integration last sync time
        await ctx.db.integrations.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
          },
        })

        return {
          success: true,
          jobId: syncJob.id,
          productsCreated: createdCount,
          productsUpdated: updatedCount,
          totalProducts: loyverseItems.length,
          message: `Successfully imported ${createdCount} new products and updated ${updatedCount} existing products from Loyverse`,
        }
      } catch (error) {
        // Mark sync job as failed
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to import products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Push a product to Loyverse (create or update)
   */
  pushProductToLoyverse: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      productId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify access
      const product = await ctx.db.products.findFirst({
        where: {
          id: input.productId,
          menus: {
            restaurantId: input.restaurantId,
            restaurants: {
              organizationId,
              isActive: true,
            },
            isActive: true,
          },
        },
        include: {
          menus: true,
          categories: true,
        },
      })

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found or access denied',
        })
      }

      // Get integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'loyverse',
          },
        },
      })

      if (!integration || integration.status !== 'CONNECTED') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Loyverse integration not connected',
        })
      }

      // Create Loyverse client
      const client = await createLoyverseClient(input.restaurantId)
      if (!client) {
        throw new Error('Failed to create Loyverse client')
      }

      try {
        // Check if product already exists in Loyverse
        const existingMapping = await ctx.db.platform_mappings.findUnique({
          where: {
            productId_platformId: {
              productId: input.productId,
              platformId: 'loyverse',
            },
          },
        })

        // Prepare Loyverse item data
        const loyverseItemData: Partial<LoyverseItem> = {
          item_name: product.name,
          description: product.description || undefined,
          price: Number(product.basePrice),
          sku: product.sku || undefined,
          barcode: product.barcode || undefined,
          category_id: undefined, // Would need category mapping
          track_stock: false,
          sold_by_weight: false,
          is_service: false,
          is_composite: product.isComposite,
        }

        let loyverseItem: LoyverseItem

        if (existingMapping) {
          // Update existing item
          loyverseItem = await client.put<LoyverseItem>(
            `/items/${existingMapping.externalId}`,
            loyverseItemData
          )
        } else {
          // Create new item
          loyverseItem = await client.post<LoyverseItem>('/items', loyverseItemData)

          // Create platform mapping
          await ctx.db.platform_mappings.create({
            data: {
              id: `mapping_${Date.now()}_${input.productId}`,
              productId: input.productId,
              platformId: 'loyverse',
              externalId: loyverseItem.id,
              externalData: loyverseItem,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })
        }

        return {
          success: true,
          loyverseItemId: loyverseItem.id,
          action: existingMapping ? 'updated' : 'created',
          message: `Product ${existingMapping ? 'updated' : 'created'} in Loyverse`,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to push product to Loyverse: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Sync prices from Loyverse to Tightship
   */
  syncPricesFromLoyverse: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      menuId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify access
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId,
          isActive: true,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found or access denied',
        })
      }

      // Get integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'loyverse',
          },
        },
      })

      if (!integration || integration.status !== 'CONNECTED') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Loyverse integration not connected',
        })
      }

      // Create sync job
      const syncJob = await ctx.db.sync_jobs.create({
        data: {
          id: `loyverse_prices_${Date.now()}_${input.restaurantId}`,
          integrationId: integration.id,
          restaurantId: input.restaurantId,
          type: 'PRICE_ONLY',
          direction: 'PULL',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          progress: {
            step: 'fetching_prices',
            pricesUpdated: 0,
          },
        },
      })

      try {
        // Create Loyverse client
        const client = await createLoyverseClient(input.restaurantId)
        if (!client) {
          throw new Error('Failed to create Loyverse client')
        }

        // Fetch all items from Loyverse
        const loyverseItems = await client.paginate<LoyverseItem>('/items')

        let updatedCount = 0

        // Update prices for mapped products
        for (const loyverseItem of loyverseItems) {
          // Find product by platform mapping
          const mapping = await ctx.db.platform_mappings.findFirst({
            where: {
              platformId: 'loyverse',
              externalId: loyverseItem.id,
            },
            include: {
              products: true,
            },
          })

          if (mapping && mapping.products.menuId === input.menuId) {
            const currentPrice = Number(mapping.products.basePrice)
            const newPrice = loyverseItem.price

            if (currentPrice !== newPrice) {
              // Update product price
              await ctx.db.products.update({
                where: { id: mapping.productId },
                data: {
                  basePrice: newPrice,
                  updatedAt: new Date(),
                },
              })

              // Create price history entry
              await ctx.db.price_history.create({
                data: {
                  id: `price_history_${Date.now()}_${mapping.productId}`,
                  productId: mapping.productId,
                  platformId: 'loyverse',
                  oldPrice: currentPrice,
                  newPrice: newPrice,
                  changeReason: 'Synced from Loyverse',
                  createdAt: new Date(),
                },
              })

              updatedCount++
            }
          }
        }

        // Complete the sync job
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: {
              pricesUpdated: updatedCount,
              totalItems: loyverseItems.length,
              success: true,
            },
          },
        })

        // Update integration last sync time
        await ctx.db.integrations.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
          },
        })

        return {
          success: true,
          jobId: syncJob.id,
          pricesUpdated: updatedCount,
          message: `Successfully updated ${updatedCount} prices from Loyverse`,
        }
      } catch (error) {
        // Mark sync job as failed
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to sync prices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Trigger a full sync (categories + products + prices)
   * NOTE: In production, this should use a job queue for background processing
   */
  triggerFullSync: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      menuId: z.string(),
      importImages: z.boolean().default(true),
    }))
    .mutation(async () => {
      // For now, return a placeholder response
      // In production, this should:
      // 1. Create a background job
      // 2. Call importCategories, importProducts, and syncPricesFromLoyverse sequentially
      // 3. Track overall progress

      return {
        success: true,
        message: 'Full sync will be implemented with job queue in Phase 4',
        note: 'Use individual sync operations for now (Categories → Products → Prices)',
      }
    }),
})

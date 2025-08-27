import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'

export const restaurantRouter = createTRPCRouter({
  list: organizationProcedure.query(async ({ ctx }) => {
    const restaurants = await ctx.db.restaurants.findMany({
      where: {
        organizationId: ctx.session.user.organizationId,
        isActive: true,
      },
      include: {
        menus: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                products: true,
                categories: true,
              },
            },
          },
        },
        integrations: {
          include: {
            platforms: true,
          },
        },
        _count: {
          select: {
            menus: true,
            integrations: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return restaurants
  }),

  getById: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
        include: {
          menus: {
            where: { isActive: true },
            include: {
              categories: {
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' },
              },
              _count: {
                select: {
                  products: true,
                },
              },
            },
          },
          integrations: {
            include: {
              platforms: true,
              sync_jobs: {
                orderBy: { createdAt: 'desc' },
                take: 5,
              },
            },
          },
        },
      })

      return restaurant
    }),

  create: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1),
        address: z
          .object({
            street: z.string(),
            city: z.string(),
            state: z.string(),
            postalCode: z.string(),
            country: z.string(),
          })
          .optional(),
        timezone: z.string().default('Europe/London'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const restaurant = await ctx.db.restaurant.create({
        data: {
          ...input,
          organizationId: ctx.session.user.organizationId,
          address: input.address ? JSON.stringify(input.address) : undefined,
        },
      })

      // Create default menu
      await ctx.db.menu.create({
        data: {
          name: 'Main Menu',
          restaurantId: restaurant.id,
          description: 'Default menu for ' + restaurant.name,
        },
      })

      return restaurant
    }),

  update: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        address: z
          .object({
            street: z.string(),
            city: z.string(),
            state: z.string(),
            postalCode: z.string(),
            country: z.string(),
          })
          .optional(),
        timezone: z.string().optional(),
        settings: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const restaurant = await ctx.db.restaurant.updateMany({
        where: {
          id,
          organizationId: ctx.session.user.organizationId,
        },
        data: {
          ...data,
          address: data.address ? JSON.stringify(data.address) : undefined,
          settings: data.settings ? JSON.stringify(data.settings) : undefined,
        },
      })

      return restaurant
    }),
})
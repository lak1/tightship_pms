import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

const customLabelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  width: z.number().min(1).max(1000),
  height: z.number().min(1).max(1000),
  columns: z.number().min(1).max(50),
  rows: z.number().min(1).max(100),
  topMargin: z.number().min(0).max(100),
  leftMargin: z.number().min(0).max(100),
  rightMargin: z.number().min(0).max(100).optional(),
  bottomMargin: z.number().min(0).max(100).optional(),
  horizontalSpacing: z.number().min(0).max(100),
  verticalSpacing: z.number().min(0).max(100),
  pageWidth: z.number().min(1).max(1000).default(210),
  pageHeight: z.number().min(1).max(1000).default(297),
  category: z.string().default('custom'),
  isShared: z.boolean().default(false)
})

export const labelsRouter = createTRPCRouter({
  // List custom labels for organization
  listCustom: organizationProcedure.query(async ({ ctx }) => {
    const labels = await ctx.db.custom_labels.findMany({
      where: {
        organizationId: ctx.session.user.organizationId,
      },
      include: {
        creator: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isShared: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return labels
  }),

  // Create a new custom label
  create: organizationProcedure
    .input(customLabelSchema)
    .mutation(async ({ ctx, input }) => {
      const label = await ctx.db.custom_labels.create({
        data: {
          id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...input,
          organizationId: ctx.session.user.organizationId,
          createdBy: ctx.session.user.id,
        },
        include: {
          creator: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      })

      return label
    }),

  // Update an existing custom label
  update: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        ...customLabelSchema.partial().shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input

      // Verify the label belongs to this organization
      const existingLabel = await ctx.db.custom_labels.findFirst({
        where: {
          id,
          organizationId: ctx.session.user.organizationId,
        },
      })

      if (!existingLabel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Custom label not found',
        })
      }

      // Only the creator or admin can update (or if it's shared)
      if (
        existingLabel.createdBy !== ctx.session.user.id &&
        !['OWNER', 'ADMIN'].includes(ctx.session.user.role)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only edit labels you created',
        })
      }

      const label = await ctx.db.custom_labels.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      })

      return label
    }),

  // Delete a custom label
  delete: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the label belongs to this organization
      const existingLabel = await ctx.db.custom_labels.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      })

      if (!existingLabel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Custom label not found',
        })
      }

      // Only the creator or admin can delete
      if (
        existingLabel.createdBy !== ctx.session.user.id &&
        !['OWNER', 'ADMIN'].includes(ctx.session.user.role)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete labels you created',
        })
      }

      await ctx.db.custom_labels.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Get a specific custom label by ID
  getById: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const label = await ctx.db.custom_labels.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
        include: {
          creator: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      })

      if (!label) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Custom label not found',
        })
      }

      return label
    }),

  // Duplicate an existing label (create a copy)
  duplicate: organizationProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const originalLabel = await ctx.db.custom_labels.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      })

      if (!originalLabel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Original label not found',
        })
      }

      const label = await ctx.db.custom_labels.create({
        data: {
          id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: input.name,
          description: originalLabel.description ? `Copy of ${originalLabel.description}` : undefined,
          width: originalLabel.width,
          height: originalLabel.height,
          columns: originalLabel.columns,
          rows: originalLabel.rows,
          topMargin: originalLabel.topMargin,
          leftMargin: originalLabel.leftMargin,
          rightMargin: originalLabel.rightMargin,
          bottomMargin: originalLabel.bottomMargin,
          horizontalSpacing: originalLabel.horizontalSpacing,
          verticalSpacing: originalLabel.verticalSpacing,
          pageWidth: originalLabel.pageWidth,
          pageHeight: originalLabel.pageHeight,
          category: originalLabel.category,
          isShared: false, // New copies are private by default
          organizationId: ctx.session.user.organizationId,
          createdBy: ctx.session.user.id,
        },
        include: {
          creator: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      })

      return label
    }),
})
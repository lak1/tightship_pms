import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'

export const designRouter = createTRPCRouter({
  // Get all templates (public + organization specific)
  getTemplates: organizationProcedure
    .input(z.object({
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      const templates = await ctx.db.menu_templates.findMany({
        where: {
          OR: [
            { isPublic: true }, // Public templates
            { organizationId }, // Organization-specific templates
          ],
          ...(input.category ? { category: input.category } : {}),
          isActive: true,
        },
        include: {
          creator: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              designs: true,
            },
          },
        },
        orderBy: [
          { isPublic: 'desc' }, // Public templates first
          { createdAt: 'desc' },
        ],
      })

      return templates
    }),

  // Create a new template
  createTemplate: organizationProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().default('menu'),
      templateData: z.any(), // Fabric.js JSON data
      isPublic: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId
      const userId = ctx.session.user.id

      const template = await ctx.db.menu_templates.create({
        data: {
          id: `template_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: input.name,
          description: input.description,
          category: input.category,
          templateData: input.templateData,
          organizationId,
          createdBy: userId,
          isPublic: input.isPublic,
        },
        include: {
          creator: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      return template
    }),

  // Get user's designs
  getDesigns: organizationProcedure
    .input(z.object({
      restaurantId: z.string().optional(),
      menuId: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      const designs = await ctx.db.menu_designs.findMany({
        where: {
          restaurant: {
            organizationId,
            ...(input.restaurantId ? { id: input.restaurantId } : {}),
          },
          ...(input.menuId ? { menuId: input.menuId } : {}),
          isActive: true,
        },
        include: {
          template: {
            select: {
              name: true,
              category: true,
            },
          },
          restaurant: {
            select: {
              name: true,
            },
          },
          menu: {
            select: {
              name: true,
            },
          },
          creator: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              assets: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: input.limit,
      })

      return designs
    }),

  // Get a specific design
  getDesign: organizationProcedure
    .input(z.object({
      designId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      const design = await ctx.db.menu_designs.findFirst({
        where: {
          id: input.designId,
          restaurant: {
            organizationId,
          },
          isActive: true,
        },
        include: {
          template: true,
          restaurant: true,
          menu: true,
          creator: {
            select: {
              name: true,
              email: true,
            },
          },
          assets: true,
        },
      })

      if (!design) {
        throw new Error('Design not found or access denied')
      }

      return design
    }),

  // Save/create a design
  saveDesign: organizationProcedure
    .input(z.object({
      id: z.string().optional(), // If provided, update existing design
      name: z.string().min(1),
      description: z.string().optional(),
      designData: z.any(), // Fabric.js JSON data
      templateId: z.string().optional(),
      restaurantId: z.string(),
      menuId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId
      const userId = ctx.session.user.id

      // Verify restaurant belongs to organization
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId,
          isActive: true,
        },
      })

      if (!restaurant) {
        throw new Error('Restaurant not found or access denied')
      }

      // If menuId is provided, verify it belongs to the restaurant
      if (input.menuId) {
        const menu = await ctx.db.menus.findFirst({
          where: {
            id: input.menuId,
            restaurantId: input.restaurantId,
            isActive: true,
          },
        })

        if (!menu) {
          throw new Error('Menu not found or access denied')
        }
      }

      const designData = {
        name: input.name,
        description: input.description,
        designData: input.designData,
        templateId: input.templateId,
        restaurantId: input.restaurantId,
        menuId: input.menuId,
        updatedAt: new Date(),
      }

      if (input.id) {
        // Update existing design
        const design = await ctx.db.menu_designs.update({
          where: {
            id: input.id,
          },
          data: designData,
          include: {
            template: true,
            restaurant: true,
            menu: true,
            creator: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        })

        return design
      } else {
        // Create new design
        const design = await ctx.db.menu_designs.create({
          data: {
            id: `design_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            ...designData,
            createdBy: userId,
          },
          include: {
            template: true,
            restaurant: true,
            menu: true,
            creator: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        })

        return design
      }
    }),

  // Delete a design
  deleteDesign: organizationProcedure
    .input(z.object({
      designId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify design belongs to organization
      const design = await ctx.db.menu_designs.findFirst({
        where: {
          id: input.designId,
          restaurant: {
            organizationId,
          },
        },
      })

      if (!design) {
        throw new Error('Design not found or access denied')
      }

      // Soft delete by setting isActive to false
      await ctx.db.menu_designs.update({
        where: {
          id: input.designId,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      })

      return { success: true }
    }),

  // Get design statistics
  getStats: organizationProcedure
    .input(z.object({
      restaurantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      const where = {
        restaurant: {
          organizationId,
          ...(input.restaurantId ? { id: input.restaurantId } : {}),
        },
        isActive: true,
      }

      const [totalDesigns, recentDesigns, templatesUsed] = await Promise.all([
        ctx.db.menu_designs.count({ where }),
        ctx.db.menu_designs.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
        ctx.db.menu_designs.groupBy({
          by: ['templateId'],
          where: {
            ...where,
            templateId: { not: null },
          },
          _count: true,
        }),
      ])

      return {
        totalDesigns,
        recentDesigns,
        templatesUsed: templatesUsed.length,
        mostUsedTemplates: templatesUsed.slice(0, 5),
      }
    }),

  // ==================== COLOR PALETTES ====================

  // Get all color palettes (public + organization specific)
  getColorPalettes: organizationProcedure
    .query(async ({ ctx }) => {
      const organizationId = ctx.session.user.organizationId

      const palettes = await ctx.db.color_palettes.findMany({
        where: {
          OR: [
            { isPublic: true }, // Public palettes
            { organizationId }, // Organization-specific palettes
          ],
        },
        orderBy: [
          { isDefault: 'desc' }, // Default palettes first
          { isPublic: 'desc' }, // Then public palettes
          { createdAt: 'desc' },
        ],
      })

      return palettes
    }),

  // Create a new color palette
  createColorPalette: organizationProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      colors: z.any(), // JSON array of color objects
      isPublic: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId
      const userId = ctx.session.user.id

      const palette = await ctx.db.color_palettes.create({
        data: {
          id: `palette_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: input.name,
          description: input.description,
          colors: input.colors,
          organizationId,
          createdBy: userId,
          isPublic: input.isPublic,
        },
      })

      return palette
    }),

  // Update a color palette
  updateColorPalette: organizationProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      colors: z.any().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify palette belongs to organization
      const existingPalette = await ctx.db.color_palettes.findFirst({
        where: {
          id: input.id,
          organizationId,
        },
      })

      if (!existingPalette) {
        throw new Error('Color palette not found or access denied')
      }

      const { id, ...updateData } = input

      const palette = await ctx.db.color_palettes.update({
        where: {
          id: input.id,
        },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      })

      return palette
    }),

  // Delete a color palette
  deleteColorPalette: organizationProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify palette belongs to organization and is not a default palette
      const palette = await ctx.db.color_palettes.findFirst({
        where: {
          id: input.id,
          organizationId,
          isDefault: false, // Cannot delete default palettes
        },
      })

      if (!palette) {
        throw new Error('Color palette not found, access denied, or cannot delete default palette')
      }

      await ctx.db.color_palettes.delete({
        where: {
          id: input.id,
        },
      })

      return { success: true }
    }),

  // ==================== VERSION HISTORY ====================

  // Get version history for a design
  getVersionHistory: organizationProcedure
    .input(z.object({
      designId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify design belongs to organization
      const design = await ctx.db.menu_designs.findFirst({
        where: {
          id: input.designId,
          restaurant: {
            organizationId,
          },
        },
      })

      if (!design) {
        throw new Error('Design not found or access denied')
      }

      const versions = await ctx.db.design_versions.findMany({
        where: {
          designId: input.designId,
        },
        include: {
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          versionNumber: 'desc',
        },
      })

      return versions
    }),

  // Create a new version
  createVersion: organizationProcedure
    .input(z.object({
      designId: z.string(),
      designData: z.any(),
      changeDescription: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId
      const userId = ctx.session.user.id

      // Verify design belongs to organization
      const design = await ctx.db.menu_designs.findFirst({
        where: {
          id: input.designId,
          restaurant: {
            organizationId,
          },
        },
      })

      if (!design) {
        throw new Error('Design not found or access denied')
      }

      // Get the latest version number
      const latestVersion = await ctx.db.design_versions.findFirst({
        where: {
          designId: input.designId,
        },
        orderBy: {
          versionNumber: 'desc',
        },
      })

      const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1

      const version = await ctx.db.design_versions.create({
        data: {
          id: `version_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          designId: input.designId,
          versionNumber: nextVersionNumber,
          designData: input.designData,
          createdBy: userId,
          changeDescription: input.changeDescription,
        },
      })

      return version
    }),

  // Restore a version
  restoreVersion: organizationProcedure
    .input(z.object({
      versionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      const version = await ctx.db.design_versions.findFirst({
        where: {
          id: input.versionId,
        },
        include: {
          design: {
            include: {
              restaurant: true,
            },
          },
        },
      })

      if (!version || version.design.restaurant.organizationId !== organizationId) {
        throw new Error('Version not found or access denied')
      }

      // Update the design with the restored data
      await ctx.db.menu_designs.update({
        where: {
          id: version.designId,
        },
        data: {
          designData: version.designData,
          updatedAt: new Date(),
        },
      })

      return version.designData
    }),

  // ==================== DESIGN COMMENTS ====================

  // Get comments for a design
  getComments: organizationProcedure
    .input(z.object({
      designId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify design belongs to organization
      const design = await ctx.db.menu_designs.findFirst({
        where: {
          id: input.designId,
          restaurant: {
            organizationId,
          },
        },
      })

      if (!design) {
        throw new Error('Design not found or access denied')
      }

      const comments = await ctx.db.design_comments.findMany({
        where: {
          designId: input.designId,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return comments
    }),

  // Create a comment
  createComment: organizationProcedure
    .input(z.object({
      designId: z.string(),
      comment: z.string().min(1),
      x: z.number().optional(),
      y: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId
      const userId = ctx.session.user.id

      // Verify design belongs to organization
      const design = await ctx.db.menu_designs.findFirst({
        where: {
          id: input.designId,
          restaurant: {
            organizationId,
          },
        },
      })

      if (!design) {
        throw new Error('Design not found or access denied')
      }

      const comment = await ctx.db.design_comments.create({
        data: {
          id: `comment_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          designId: input.designId,
          userId,
          comment: input.comment,
          x: input.x,
          y: input.y,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      return comment
    }),

  // Resolve a comment
  resolveComment: organizationProcedure
    .input(z.object({
      commentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      const comment = await ctx.db.design_comments.findFirst({
        where: {
          id: input.commentId,
        },
        include: {
          design: {
            include: {
              restaurant: true,
            },
          },
        },
      })

      if (!comment || comment.design.restaurant.organizationId !== organizationId) {
        throw new Error('Comment not found or access denied')
      }

      const updatedComment = await ctx.db.design_comments.update({
        where: {
          id: input.commentId,
        },
        data: {
          resolved: true,
        },
      })

      return updatedComment
    }),

  // Delete a comment
  deleteComment: organizationProcedure
    .input(z.object({
      commentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId
      const userId = ctx.session.user.id

      const comment = await ctx.db.design_comments.findFirst({
        where: {
          id: input.commentId,
        },
        include: {
          design: {
            include: {
              restaurant: true,
            },
          },
        },
      })

      if (!comment || comment.design.restaurant.organizationId !== organizationId) {
        throw new Error('Comment not found or access denied')
      }

      // Only the comment author can delete it
      if (comment.userId !== userId) {
        throw new Error('Only the comment author can delete it')
      }

      await ctx.db.design_comments.delete({
        where: {
          id: input.commentId,
        },
      })

      return { success: true }
    }),
})
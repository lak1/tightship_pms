import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { randomBytes } from 'crypto'
import { addEmailJob } from '@/lib/queue/queues'

/**
 * Team Management Router
 * Handles user invitations, role management, and team member operations
 */
export const teamRouter = createTRPCRouter({
  /**
   * List all team members in the organization
   */
  getTeamMembers: organizationProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.user.organizationId

    const members = await ctx.db.users.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })

    return members
  }),

  /**
   * Invite a new team member
   */
  inviteTeamMember: organizationProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1),
        role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'STAFF']).default('STAFF'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Only OWNER and ADMIN can invite members
      if (!['OWNER', 'ADMIN'].includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can invite team members',
        })
      }

      // Check if user already exists
      const existingUser = await ctx.db.users.findUnique({
        where: { email: input.email },
      })

      if (existingUser) {
        if (existingUser.organizationId === organizationId) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User is already a member of this organization',
          })
        } else {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User already exists in another organization',
          })
        }
      }

      // Generate invitation token
      const token = randomBytes(32).toString('hex')
      const expires = new Date()
      expires.setDate(expires.getDate() + 7) // Token expires in 7 days

      // Create verification token
      await ctx.db.verification_tokens.create({
        data: {
          id: randomBytes(16).toString('hex'),
          email: input.email,
          token,
          type: 'team_invitation',
          expires,
        },
      })

      // Get organization name
      const organization = await ctx.db.organizations.findUnique({
        where: { id: organizationId },
        select: { name: true },
      })

      // Send invitation email
      await addEmailJob({
        to: input.email,
        template: 'team-invitation',
        data: {
          name: input.name,
          organizationName: organization?.name || 'your organization',
          inviterName: ctx.session.user.name || 'A team member',
          inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${token}`,
          role: input.role,
        },
      })

      return {
        success: true,
        message: 'Invitation sent successfully',
      }
    }),

  /**
   * Update team member role
   */
  updateMemberRole: organizationProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'STAFF']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Only OWNER can change roles
      if (ctx.session.user.role !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners can change team member roles',
        })
      }

      // Cannot change your own role
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot change your own role',
        })
      }

      // Verify user belongs to organization
      const user = await ctx.db.users.findFirst({
        where: {
          id: input.userId,
          organizationId,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found in your organization',
        })
      }

      // Update role
      await ctx.db.users.update({
        where: { id: input.userId },
        data: {
          role: input.role,
          updatedAt: new Date(),
        },
      })

      return {
        success: true,
        message: 'Role updated successfully',
      }
    }),

  /**
   * Remove team member
   */
  removeMember: organizationProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Only OWNER and ADMIN can remove members
      if (!['OWNER', 'ADMIN'].includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can remove team members',
        })
      }

      // Cannot remove yourself
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot remove yourself from the team',
        })
      }

      // Verify user belongs to organization
      const user = await ctx.db.users.findFirst({
        where: {
          id: input.userId,
          organizationId,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found in your organization',
        })
      }

      // Soft delete by setting isActive to false and removing organizationId
      await ctx.db.users.update({
        where: { id: input.userId },
        data: {
          isActive: false,
          organizationId: null,
          updatedAt: new Date(),
        },
      })

      return {
        success: true,
        message: 'Team member removed successfully',
      }
    }),

  /**
   * Get pending invitations
   */
  getPendingInvitations: organizationProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.user.organizationId

    // Get organization email domain or check recent invitations
    const invitations = await ctx.db.verification_tokens.findMany({
      where: {
        type: 'team_invitation',
        used: false,
        expires: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      createdAt: inv.createdAt,
      expires: inv.expires,
    }))
  }),

  /**
   * Resend invitation
   */
  resendInvitation: organizationProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Only OWNER and ADMIN can resend invitations
      if (!['OWNER', 'ADMIN'].includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can resend invitations',
        })
      }

      const invitation = await ctx.db.verification_tokens.findUnique({
        where: { id: input.invitationId },
      })

      if (!invitation || invitation.type !== 'team_invitation') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        })
      }

      // Generate new token
      const token = randomBytes(32).toString('hex')
      const expires = new Date()
      expires.setDate(expires.getDate() + 7)

      // Update invitation
      await ctx.db.verification_tokens.update({
        where: { id: input.invitationId },
        data: {
          token,
          expires,
        },
      })

      // Get organization name
      const organization = await ctx.db.organizations.findUnique({
        where: { id: organizationId },
        select: { name: true },
      })

      // Resend email
      await addEmailJob({
        to: invitation.email,
        template: 'team-invitation',
        data: {
          name: invitation.email.split('@')[0], // Use email prefix as name
          organizationName: organization?.name || 'your organization',
          inviterName: ctx.session.user.name || 'A team member',
          inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${token}`,
          role: 'STAFF',
        },
      })

      return {
        success: true,
        message: 'Invitation resent successfully',
      }
    }),

  /**
   * Cancel invitation
   */
  cancelInvitation: organizationProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only OWNER and ADMIN can cancel invitations
      if (!['OWNER', 'ADMIN'].includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can cancel invitations',
        })
      }

      const invitation = await ctx.db.verification_tokens.findUnique({
        where: { id: input.invitationId },
      })

      if (!invitation || invitation.type !== 'team_invitation') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        })
      }

      // Delete invitation
      await ctx.db.verification_tokens.delete({
        where: { id: input.invitationId },
      })

      return {
        success: true,
        message: 'Invitation cancelled successfully',
      }
    }),
})

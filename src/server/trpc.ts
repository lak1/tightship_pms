import { initTRPC, TRPCError } from '@trpc/server'
import { type NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db as db } from '@/lib/db'
import superjson from 'superjson'
import { ZodError } from 'zod'

export const createTRPCContext = async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  return {
    db,
    session,
    req,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    }
  },
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(
  t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    
    return next({
      ctx: {
        ...ctx,
        session: { ...ctx.session, user: ctx.session.user },
      },
    })
  })
)

export const organizationProcedure = protectedProcedure.use(
  t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user?.organizationId) {
      throw new TRPCError({ 
        code: 'FORBIDDEN',
        message: 'User must belong to an organization'
      })
    }
    
    return next({
      ctx: {
        ...ctx,
        session: { 
          ...ctx.session, 
          user: { 
            ...ctx.session.user,
            organizationId: ctx.session.user.organizationId as string
          }
        },
      },
    })
  })
)
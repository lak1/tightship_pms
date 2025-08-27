import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

// Create Prisma client with RLS support
export async function getPrismaWithRLS() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    throw new Error('Unauthorized - no session')
  }

  // Create Prisma client with user context for RLS
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

  // Set the JWT claims for RLS policies
  // This tells Supabase who the current user is
  await prisma.$executeRaw`
    SELECT set_config('request.jwt.claims', '${JSON.stringify({
      email: session.user.email,
      sub: session.user.id,
    })}', true)
  `

  return prisma
}

// For API routes that need RLS
export async function withRLS<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const prisma = await getPrismaWithRLS()
  
  try {
    return await callback(prisma)
  } finally {
    await prisma.$disconnect()
  }
}
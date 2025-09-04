import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create a new Prisma client optimized for Supabase free tier
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    errorFormat: 'minimal',
    transactionOptions: {
      maxWait: 2000, // 2 seconds - shorter for free tier
      timeout: 5000, // 5 seconds - shorter timeout
      isolationLevel: 'ReadCommitted', // Less strict isolation
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Connection management utilities
let isConnected = false
let connectionPromise: Promise<void> | null = null

async function connectDB() {
  if (isConnected) return
  
  if (connectionPromise) {
    return connectionPromise
  }
  
  connectionPromise = db.$connect()
    .then(() => {
      isConnected = true
      console.log('✅ Database connected successfully')
    })
    .catch((error) => {
      console.error('❌ Database connection failed:', error)
      isConnected = false
      connectionPromise = null
      throw error
    })
    
  return connectionPromise
}

async function disconnectDB() {
  if (!isConnected) return
  
  try {
    await db.$disconnect()
    isConnected = false
    connectionPromise = null
    console.log('✅ Database disconnected successfully')
  } catch (error) {
    console.error('❌ Database disconnection failed:', error)
  }
}

// Enhanced database client with automatic reconnection
export const dbClient = {
  ...db,
  async $transaction<R>(
    fn: (prisma: PrismaClient) => Promise<R>,
    options?: Parameters<PrismaClient['$transaction']>[1]
  ): Promise<R> {
    try {
      await connectDB()
      return await db.$transaction(fn, options)
    } catch (error: any) {
      // Check if it's a connection-related error
      if (
        error?.code === '26000' || // prepared statement does not exist
        error?.code === '42P05' || // prepared statement already exists
        error?.code === '08P01' || // protocol violation
        error?.message?.includes('prepared statement') ||
        error?.message?.includes('connection')
      ) {
        console.warn('🔄 Connection issue detected, reconnecting...')
        await disconnectDB()
        await connectDB()
        return await db.$transaction(fn, options)
      }
      throw error
    }
  },
}

// Auto-connect when the module is loaded
connectDB().catch(console.error)

// Graceful shutdown
async function gracefulShutdown() {
  console.log('🔄 Shutting down database connections...')
  await disconnectDB()
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
process.on('beforeExit', disconnectDB)
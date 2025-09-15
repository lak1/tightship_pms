import { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

interface CountOptions {
  where?: any
}

interface FindOptions {
  where?: any
  select?: any
  include?: any
  orderBy?: any
  take?: number
  skip?: number
}

interface GroupByOptions {
  by: string[]
  where?: any
  _count?: boolean
  _sum?: any
  _avg?: any
  _min?: any
  _max?: any
}

// Simplified database service optimized for Supabase PgBouncer
export const dbService = {
  // Generic count function with error handling
  async count(model: string, options: CountOptions = {}): Promise<number> {
    try {
      const modelClient = (db as any)[model]
      if (!modelClient) {
        throw new Error(`Model '${model}' not found`)
      }
      return await modelClient.count(options)
    } catch (error) {
      logger.error(`Failed to count ${model}:`, error)
      return 0
    }
  },

  // Generic findMany function with error handling
  async findMany(model: string, options: FindOptions = {}): Promise<any[]> {
    try {
      const modelClient = (db as any)[model]
      if (!modelClient) {
        throw new Error(`Model '${model}' not found`)
      }
      return await modelClient.findMany(options)
    } catch (error) {
      logger.error(`Failed to findMany ${model}:`, error)
      return []
    }
  },

  // Generic groupBy function with error handling
  async groupBy(model: string, options: GroupByOptions): Promise<any[]> {
    try {
      const modelClient = (db as any)[model]
      if (!modelClient) {
        throw new Error(`Model '${model}' not found`)
      }
      return await modelClient.groupBy(options)
    } catch (error) {
      logger.error(`Failed to groupBy ${model}:`, error)
      return []
    }
  },

  // Simple execute function - let PgBouncer handle connection issues
  async executeWithRetry<T>(
    operation: (client: PrismaClient) => Promise<T>,
    operationName: string,
    maxRetries: number = 1
  ): Promise<T> {
    try {
      return await operation(db)
    } catch (error: any) {
      logger.error(`Operation ${operationName} failed:`, {
        error: error.message,
        code: error.code
      })
      throw error
    }
  },

  // Batch operations to reduce database calls
  async batchCount(queries: Array<{ model: string; options?: CountOptions }>): Promise<number[]> {
    const results = await Promise.allSettled(
      queries.map(query => this.count(query.model, query.options))
    )
    
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : 0
    )
  },

  // Simple transaction wrapper
  async transaction<T>(operations: (tx: PrismaClient) => Promise<T>): Promise<T> {
    try {
      return await db.$transaction(operations, {
        maxWait: 3000,
        timeout: 10000,
      })
    } catch (error: any) {
      logger.error('Transaction failed:', {
        error: error.message,
        code: error.code
      })
      throw error
    }
  }
}
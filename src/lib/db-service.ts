import { PrismaClient } from '@prisma/client'
import { db } from './db'

/**
 * Database service wrapper that handles Supabase connection pooling issues
 */
class DatabaseService {
  private retryCount = 3
  private retryDelay = 1000 // 1 second

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private isPreparedStatementError(error: any): boolean {
    return (
      error?.code === '26000' || // prepared statement does not exist
      error?.code === '42P05' || // prepared statement already exists
      error?.code === '08P01' || // protocol violation
      error?.message?.includes('prepared statement') ||
      error?.message?.includes('bind message supplies') ||
      (error?.constructor?.name === 'PrismaClientUnknownRequestError' &&
        error?.message?.includes('prepared statement'))
    )
  }

  private isConnectionError(error: any): boolean {
    return (
      error?.code === '08006' || // connection failure
      error?.code === '08000' || // connection exception
      error?.message?.includes('connection') ||
      error?.message?.includes('Connection terminated unexpectedly') ||
      error?.message?.includes("Can't reach database server")
    )
  }

  async executeWithRetry<T>(
    operation: (client: PrismaClient) => Promise<T>,
    operationName = 'database operation'
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        return await operation(db)
      } catch (error: any) {
        lastError = error
        
        console.warn(`⚠️  ${operationName} failed (attempt ${attempt}/${this.retryCount}):`, {
          code: error?.code,
          message: error?.message?.substring(0, 200),
          isPreparedStatementError: this.isPreparedStatementError(error),
          isConnectionError: this.isConnectionError(error)
        })

        // Don't retry for non-connection related errors
        if (!this.isPreparedStatementError(error) && !this.isConnectionError(error)) {
          throw error
        }

        // Don't retry on the last attempt
        if (attempt === this.retryCount) {
          break
        }

        // For all retryable errors, just wait and try again with simple reconnect
        if (this.isPreparedStatementError(error) || this.isConnectionError(error)) {
          try {
            await db.$disconnect()
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
            await db.$connect()
          } catch (reconnectError) {
            console.warn('Failed to reconnect:', reconnectError)
          }
        }

        // Wait before retrying, with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1)
        await this.sleep(delay)
      }
    }

    console.error(`❌ ${operationName} failed after ${this.retryCount} attempts:`, lastError)
    throw lastError
  }

  // Convenience methods for common operations
  async findMany<T>(model: string, args?: any): Promise<T[]> {
    return this.executeWithRetry(
      (client) => (client as any)[model].findMany(args),
      `${model}.findMany`
    )
  }

  async findUnique<T>(model: string, args: any): Promise<T | null> {
    return this.executeWithRetry(
      (client) => (client as any)[model].findUnique(args),
      `${model}.findUnique`
    )
  }

  async count(model: string, args?: any): Promise<number> {
    return this.executeWithRetry(
      (client) => (client as any)[model].count(args),
      `${model}.count`
    )
  }

  async create<T>(model: string, args: any): Promise<T> {
    return this.executeWithRetry(
      (client) => (client as any)[model].create(args),
      `${model}.create`
    )
  }

  async update<T>(model: string, args: any): Promise<T> {
    return this.executeWithRetry(
      (client) => (client as any)[model].update(args),
      `${model}.update`
    )
  }

  async delete<T>(model: string, args: any): Promise<T> {
    return this.executeWithRetry(
      (client) => (client as any)[model].delete(args),
      `${model}.delete`
    )
  }

  async groupBy<T>(model: string, args: any): Promise<T[]> {
    return this.executeWithRetry(
      (client) => (client as any)[model].groupBy(args),
      `${model}.groupBy`
    )
  }
}

export const dbService = new DatabaseService()
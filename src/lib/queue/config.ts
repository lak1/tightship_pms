/**
 * BullMQ Queue Configuration
 *
 * Uses Upstash Redis for serverless-friendly job queue management
 * Documentation: https://docs.bullmq.io/
 * Upstash: https://upstash.com/
 */

import { Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq'
import IORedis from 'ioredis'

/**
 * Upstash Redis connection
 * Compatible with BullMQ's ioredis requirement
 */
const connection = new IORedis(process.env.UPSTASH_REDIS_URL || '', {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  // Upstash uses TLS by default
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
})

/**
 * Default queue options
 */
export const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
}

/**
 * Default worker options
 */
export const defaultWorkerOptions: WorkerOptions = {
  connection,
  concurrency: 5, // Process up to 5 jobs concurrently
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000, // Per second
  },
}

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  MENU_SYNC: 'menu-sync',
  PRICE_SYNC: 'price-sync',
  STOCK_SYNC: 'stock-sync',
  ORDER_SYNC: 'order-sync',
  EMAIL: 'email',
  WEBHOOK: 'webhook',
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]

/**
 * Create a queue instance
 */
export function createQueue<T = unknown>(name: QueueName): Queue<T> {
  return new Queue<T>(name, defaultQueueOptions)
}

/**
 * Create a worker instance
 */
export function createWorker<T = unknown>(
  name: QueueName,
  processor: WorkerOptions['processor'],
  options?: Partial<WorkerOptions>
): Worker<T> {
  return new Worker<T>(
    name,
    processor as any,
    {
      ...defaultWorkerOptions,
      ...options,
    }
  )
}

/**
 * Health check for Redis connection
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await connection.ping()
    return true
  } catch (error) {
    console.error('Redis connection failed:', error)
    return false
  }
}

/**
 * Graceful shutdown
 */
export async function closeConnections(): Promise<void> {
  await connection.quit()
}

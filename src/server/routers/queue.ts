import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import {
  menuSyncQueue,
  priceSyncQueue,
  stockSyncQueue,
  emailQueue,
  getQueueStats,
} from '@/lib/queue/queues'

/**
 * Queue Management Router
 * Provides endpoints for monitoring and managing job queues
 */
export const queueRouter = createTRPCRouter({
  /**
   * Get statistics for all queues
   */
  getStats: organizationProcedure.query(async () => {
    const [menuStats, priceStats, stockStats, emailStats] = await Promise.all([
      getQueueStats(menuSyncQueue),
      getQueueStats(priceSyncQueue),
      getQueueStats(stockSyncQueue),
      getQueueStats(emailQueue),
    ])

    return {
      menuSync: menuStats,
      priceSync: priceStats,
      stockSync: stockStats,
      email: emailStats,
      total: {
        waiting: menuStats.waiting + priceStats.waiting + stockStats.waiting + emailStats.waiting,
        active: menuStats.active + priceStats.active + stockStats.active + emailStats.active,
        completed: menuStats.completed + priceStats.completed + stockStats.completed + emailStats.completed,
        failed: menuStats.failed + priceStats.failed + stockStats.failed + emailStats.failed,
      },
    }
  }),

  /**
   * Get jobs for a specific queue
   */
  getJobs: organizationProcedure
    .input(
      z.object({
        queueName: z.enum(['menu-sync', 'price-sync', 'stock-sync', 'email']),
        status: z.enum(['waiting', 'active', 'completed', 'failed', 'delayed']).default('waiting'),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const queueMap = {
        'menu-sync': menuSyncQueue,
        'price-sync': priceSyncQueue,
        'stock-sync': stockSyncQueue,
        email: emailQueue,
      }

      const queue = queueMap[input.queueName]

      let jobs
      switch (input.status) {
        case 'waiting':
          jobs = await queue.getWaiting(0, input.limit - 1)
          break
        case 'active':
          jobs = await queue.getActive(0, input.limit - 1)
          break
        case 'completed':
          jobs = await queue.getCompleted(0, input.limit - 1)
          break
        case 'failed':
          jobs = await queue.getFailed(0, input.limit - 1)
          break
        case 'delayed':
          jobs = await queue.getDelayed(0, input.limit - 1)
          break
      }

      return jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }))
    }),

  /**
   * Retry a failed job
   */
  retryJob: organizationProcedure
    .input(
      z.object({
        queueName: z.enum(['menu-sync', 'price-sync', 'stock-sync', 'email']),
        jobId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const queueMap = {
        'menu-sync': menuSyncQueue,
        'price-sync': priceSyncQueue,
        'stock-sync': stockSyncQueue,
        email: emailQueue,
      }

      const queue = queueMap[input.queueName]
      const job = await queue.getJob(input.jobId)

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      await job.retry()

      return {
        success: true,
        message: `Job ${input.jobId} has been retried`,
      }
    }),

  /**
   * Remove a job from queue
   */
  removeJob: organizationProcedure
    .input(
      z.object({
        queueName: z.enum(['menu-sync', 'price-sync', 'stock-sync', 'email']),
        jobId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const queueMap = {
        'menu-sync': menuSyncQueue,
        'price-sync': priceSyncQueue,
        'stock-sync': stockSyncQueue,
        email: emailQueue,
      }

      const queue = queueMap[input.queueName]
      const job = await queue.getJob(input.jobId)

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      await job.remove()

      return {
        success: true,
        message: `Job ${input.jobId} has been removed`,
      }
    }),

  /**
   * Clean completed or failed jobs
   */
  cleanQueue: organizationProcedure
    .input(
      z.object({
        queueName: z.enum(['menu-sync', 'price-sync', 'stock-sync', 'email']),
        status: z.enum(['completed', 'failed']),
        olderThan: z.number().min(0).default(86400000), // Default: 24 hours in ms
      })
    )
    .mutation(async ({ input }) => {
      const queueMap = {
        'menu-sync': menuSyncQueue,
        'price-sync': priceSyncQueue,
        'stock-sync': stockSyncQueue,
        email: emailQueue,
      }

      const queue = queueMap[input.queueName]
      const cleaned = await queue.clean(input.olderThan, 1000, input.status)

      return {
        success: true,
        jobsRemoved: cleaned.length,
        message: `Cleaned ${cleaned.length} ${input.status} jobs`,
      }
    }),

  /**
   * Pause a queue
   */
  pauseQueue: organizationProcedure
    .input(
      z.object({
        queueName: z.enum(['menu-sync', 'price-sync', 'stock-sync', 'email']),
      })
    )
    .mutation(async ({ input }) => {
      const queueMap = {
        'menu-sync': menuSyncQueue,
        'price-sync': priceSyncQueue,
        'stock-sync': stockSyncQueue,
        email: emailQueue,
      }

      const queue = queueMap[input.queueName]
      await queue.pause()

      return {
        success: true,
        message: `Queue ${input.queueName} has been paused`,
      }
    }),

  /**
   * Resume a paused queue
   */
  resumeQueue: organizationProcedure
    .input(
      z.object({
        queueName: z.enum(['menu-sync', 'price-sync', 'stock-sync', 'email']),
      })
    )
    .mutation(async ({ input }) => {
      const queueMap = {
        'menu-sync': menuSyncQueue,
        'price-sync': priceSyncQueue,
        'stock-sync': stockSyncQueue,
        email: emailQueue,
      }

      const queue = queueMap[input.queueName]
      await queue.resume()

      return {
        success: true,
        message: `Queue ${input.queueName} has been resumed`,
      }
    }),
})

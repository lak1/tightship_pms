#!/usr/bin/env tsx
/**
 * BullMQ Worker Process
 *
 * Starts all queue workers for processing background jobs
 * Run with: tsx worker.ts
 */

import { startAllWorkers, stopAllWorkers } from './src/lib/queue/workers'
import { checkRedisConnection, closeConnections } from './src/lib/queue/config'

async function main() {
  console.log('🚀 Starting Tightship Queue Workers...')

  // Check Redis connection
  const redisConnected = await checkRedisConnection()
  if (!redisConnected) {
    console.error('❌ Redis connection failed. Check UPSTASH_REDIS_URL in .env')
    process.exit(1)
  }

  console.log('✓ Redis connection: OK')

  // Start all workers
  const workers = startAllWorkers()

  console.log(`✓ ${workers.length} workers started successfully`)
  console.log('\nWorkers running. Press Ctrl+C to stop.')

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`)

    try {
      await stopAllWorkers()
      await closeConnections()
      console.log('✓ All workers stopped')
      process.exit(0)
    } catch (error) {
      console.error('❌ Error during shutdown:', error)
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Keep process alive
  process.stdin.resume()
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

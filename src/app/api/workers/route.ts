import { NextResponse } from 'next/server'
import { startAllWorkers, areWorkersRunning } from '@/lib/queue/workers'
import { checkRedisConnection } from '@/lib/queue/config'

/**
 * Start BullMQ workers
 *
 * GET /api/workers - Start workers (development only)
 *
 * Note: In production, workers should run in a separate process using worker.ts
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Workers should run in a separate process in production' },
      { status: 403 }
    )
  }

  try {
    // Check if workers are already running
    if (areWorkersRunning()) {
      return NextResponse.json({
        status: 'already_running',
        message: 'Workers are already running',
      })
    }

    // Check Redis connection
    const redisConnected = await checkRedisConnection()
    if (!redisConnected) {
      return NextResponse.json(
        { error: 'Redis connection failed. Check UPSTASH_REDIS_URL' },
        { status: 500 }
      )
    }

    // Start workers
    const workers = startAllWorkers()

    return NextResponse.json({
      status: 'started',
      message: `${workers.length} workers started successfully`,
      workers: workers.map((w) => w.name),
    })
  } catch (error) {
    console.error('Failed to start workers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

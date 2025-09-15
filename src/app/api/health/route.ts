import { NextRequest, NextResponse } from 'next/server'
import { db as db } from '@/lib/db'
import { logger } from '@/lib/logger'

// Basic health check endpoint
export async function GET(request: NextRequest) {
  const timer = logger.time('health_check')
  
  try {
    // Basic health status
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
    }

    // Check if detailed health check is requested
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'

    if (detailed) {
      const detailedHealth = await getDetailedHealth()
      timer.end()
      
      return NextResponse.json({
        ...health,
        ...detailedHealth,
      })
    }

    timer.end()
    return NextResponse.json(health)
  } catch (error) {
    logger.error('Health check failed', error)
    timer.end()
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    )
  }
}

async function getDetailedHealth() {
  const checks: Record<string, any> = {}

  // Database connectivity check
  try {
    const dbTimer = logger.time('health_check_database')
    const result = await db.$queryRaw`SELECT 1 as test`
    const dbDuration = dbTimer.end()
    
    checks.database = {
      status: 'ok',
      responseTime: `${dbDuration}ms`,
    }
  } catch (error) {
    logger.error('Database health check failed', error)
    checks.database = {
      status: 'error',
      error: 'Database connection failed',
    }
  }

  // Memory usage
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memory = process.memoryUsage()
    checks.memory = {
      status: 'ok',
      usage: {
        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memory.external / 1024 / 1024)}MB`,
      },
    }
  }

  // Uptime
  if (typeof process !== 'undefined' && process.uptime) {
    checks.uptime = {
      status: 'ok',
      seconds: Math.round(process.uptime()),
      human: formatUptime(process.uptime()),
    }
  }

  // Environment variables check (ensure critical ones are set)
  const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET']
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
  
  checks.environment = {
    status: missingEnvVars.length === 0 ? 'ok' : 'warning',
    missing: missingEnvVars,
    nodeVersion: process.version,
  }

  return { checks }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  return `${days}d ${hours}h ${minutes}m`
}
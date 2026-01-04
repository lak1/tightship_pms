/**
 * Worker Registry
 *
 * Central place to start/stop all workers
 */

import { Worker } from 'bullmq'
import { startMenuSyncWorker } from './menuSyncWorker'
import { startEmailWorker } from './emailWorker'

let workers: Worker[] = []

/**
 * Start all workers
 */
export function startAllWorkers() {
  if (workers.length > 0) {
    console.log('[Workers] Already running')
    return workers
  }

  console.log('[Workers] Starting all workers...')

  workers = [
    startMenuSyncWorker(),
    startEmailWorker(),
    // Add more workers here as they're created
  ]

  console.log(`[Workers] ${workers.length} workers started`)

  return workers
}

/**
 * Stop all workers gracefully
 */
export async function stopAllWorkers() {
  console.log('[Workers] Stopping all workers...')

  await Promise.all(workers.map(worker => worker.close()))

  workers = []

  console.log('[Workers] All workers stopped')
}

/**
 * Get running workers
 */
export function getRunningWorkers() {
  return workers
}

/**
 * Check if workers are running
 */
export function areWorkersRunning() {
  return workers.length > 0
}

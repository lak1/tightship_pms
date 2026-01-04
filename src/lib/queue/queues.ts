/**
 * Queue Instances
 *
 * Centralized queue instances for job management
 */

import { Queue } from 'bullmq'
import { createQueue, QUEUE_NAMES } from './config'

/**
 * Job Data Types
 */

export interface MenuSyncJobData {
  restaurantId: string
  menuId: string
  platformId: string
  integrationId: string
  syncType: 'FULL' | 'INCREMENTAL'
  languageCode?: string
}

export interface PriceSyncJobData {
  restaurantId: string
  platformId: string
  integrationId: string
  productIds: string[]
}

export interface StockSyncJobData {
  restaurantId: string
  platformId: string
  integrationId: string
  productIds: string[]
  makeAvailable: boolean
}

export interface OrderSyncJobData {
  restaurantId: string
  platformId: string
  integrationId: string
  orderId: string
  action: 'FETCH' | 'UPDATE_STATUS'
}

export interface EmailJobData {
  to: string
  subject: string
  template: 'WELCOME' | 'SYNC_COMPLETE' | 'SYNC_FAILED' | 'DUNNING' | 'INVOICE'
  data: Record<string, unknown>
}

export interface WebhookJobData {
  platformId: string
  eventType: string
  payload: Record<string, unknown>
  signature?: string
}

/**
 * Queue Instances
 */

export const menuSyncQueue: Queue<MenuSyncJobData> = createQueue(QUEUE_NAMES.MENU_SYNC)
export const priceSyncQueue: Queue<PriceSyncJobData> = createQueue(QUEUE_NAMES.PRICE_SYNC)
export const stockSyncQueue: Queue<StockSyncJobData> = createQueue(QUEUE_NAMES.STOCK_SYNC)
export const orderSyncQueue: Queue<OrderSyncJobData> = createQueue(QUEUE_NAMES.ORDER_SYNC)
export const emailQueue: Queue<EmailJobData> = createQueue(QUEUE_NAMES.EMAIL)
export const webhookQueue: Queue<WebhookJobData> = createQueue(QUEUE_NAMES.WEBHOOK)

/**
 * Helper Functions
 */

/**
 * Add a menu sync job to the queue
 */
export async function addMenuSyncJob(data: MenuSyncJobData, priority?: number) {
  return menuSyncQueue.add('sync-menu', data, {
    priority: priority || 1,
    jobId: `menu-sync-${data.restaurantId}-${data.platformId}-${Date.now()}`,
  })
}

/**
 * Add a price sync job to the queue
 */
export async function addPriceSyncJob(data: PriceSyncJobData, priority?: number) {
  return priceSyncQueue.add('sync-prices', data, {
    priority: priority || 2,
    jobId: `price-sync-${data.restaurantId}-${data.platformId}-${Date.now()}`,
  })
}

/**
 * Add a stock sync job to the queue
 */
export async function addStockSyncJob(data: StockSyncJobData, priority?: number) {
  return stockSyncQueue.add('sync-stock', data, {
    priority: priority || 3, // Higher priority for stock updates
    jobId: `stock-sync-${data.restaurantId}-${data.platformId}-${Date.now()}`,
  })
}

/**
 * Add an order sync job to the queue
 */
export async function addOrderSyncJob(data: OrderSyncJobData, priority?: number) {
  return orderSyncQueue.add('sync-order', data, {
    priority: priority || 5, // Highest priority for orders
    jobId: `order-sync-${data.restaurantId}-${data.platformId}-${data.orderId}`,
  })
}

/**
 * Add an email job to the queue
 */
export async function addEmailJob(data: EmailJobData, priority?: number) {
  return emailQueue.add('send-email', data, {
    priority: priority || 1,
  })
}

/**
 * Add a webhook processing job to the queue
 */
export async function addWebhookJob(data: WebhookJobData, priority?: number) {
  return webhookQueue.add('process-webhook', data, {
    priority: priority || 4,
  })
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queue: Queue) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  }
}

/**
 * Clear all queues (use with caution!)
 */
export async function clearAllQueues() {
  await Promise.all([
    menuSyncQueue.drain(),
    priceSyncQueue.drain(),
    stockSyncQueue.drain(),
    orderSyncQueue.drain(),
    emailQueue.drain(),
    webhookQueue.drain(),
  ])
}

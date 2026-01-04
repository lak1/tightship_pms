import { createTRPCRouter } from '../trpc'
import { productRouter } from './product'
import { restaurantRouter } from './restaurant'
import { googleRouter } from './google'
import { dashboardRouter } from './dashboard'
import { subscriptionRouter } from './subscription'
import { labelsRouter } from './labels'
import { syncRouter } from './sync'
import { loyverseRouter } from './loyverse'
import { deliverooRouter } from './deliveroo'
import { uberEatsRouter } from './ubereats'

export const appRouter = createTRPCRouter({
  product: productRouter,
  restaurant: restaurantRouter,
  google: googleRouter,
  dashboard: dashboardRouter,
  subscription: subscriptionRouter,
  labels: labelsRouter,
  sync: syncRouter,
  loyverse: loyverseRouter,
  deliveroo: deliverooRouter,
  uberEats: uberEatsRouter,
})

export type AppRouter = typeof appRouter
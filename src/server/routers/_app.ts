import { createTRPCRouter } from '../trpc'
import { productRouter } from './product'
import { restaurantRouter } from './restaurant'
import { googleRouter } from './google'
import { dashboardRouter } from './dashboard'
import { subscriptionRouter } from './subscription'
import { labelsRouter } from './labels'
import { syncRouter } from './sync'
import { analyticsRouter } from './analytics'
import { teamRouter } from './team'

export const appRouter = createTRPCRouter({
  product: productRouter,
  restaurant: restaurantRouter,
  google: googleRouter,
  dashboard: dashboardRouter,
  subscription: subscriptionRouter,
  labels: labelsRouter,
  sync: syncRouter,
  analytics: analyticsRouter,
  team: teamRouter,
})

export type AppRouter = typeof appRouter
import { createTRPCRouter } from '../trpc'
import { productRouter } from './product'
import { restaurantRouter } from './restaurant'
import { googleRouter } from './google'
import { dashboardRouter } from './dashboard'
import { subscriptionRouter } from './subscription'

export const appRouter = createTRPCRouter({
  product: productRouter,
  restaurant: restaurantRouter,
  google: googleRouter,
  dashboard: dashboardRouter,
  subscription: subscriptionRouter,
})

export type AppRouter = typeof appRouter
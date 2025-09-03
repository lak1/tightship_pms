import { createTRPCRouter } from '../trpc'
import { productRouter } from './product'
import { restaurantRouter } from './restaurant'
import { googleRouter } from './google'
import { dashboardRouter } from './dashboard'

export const appRouter = createTRPCRouter({
  product: productRouter,
  restaurant: restaurantRouter,
  google: googleRouter,
  dashboard: dashboardRouter,
})

export type AppRouter = typeof appRouter
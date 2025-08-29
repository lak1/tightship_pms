import { createTRPCRouter } from '../trpc'
import { productRouter } from './product'
import { restaurantRouter } from './restaurant'
import { googleRouter } from './google'

export const appRouter = createTRPCRouter({
  product: productRouter,
  restaurant: restaurantRouter,
  google: googleRouter,
})

export type AppRouter = typeof appRouter
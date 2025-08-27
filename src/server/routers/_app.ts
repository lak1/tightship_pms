import { createTRPCRouter } from '../trpc'
import { productRouter } from './product'
import { restaurantRouter } from './restaurant'

export const appRouter = createTRPCRouter({
  product: productRouter,
  restaurant: restaurantRouter,
})

export type AppRouter = typeof appRouter
// This file configures the initialization of Sentry on the browser/client side
// The config you add here will be used whenever a page is visited
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Environment configuration
  environment: process.env.NODE_ENV,

  // Performance Monitoring
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Filter out non-error events in production
  beforeSend(event) {
    // Don't send events in development unless they're errors
    if (process.env.NODE_ENV === 'development' && event.level !== 'error') {
      return null
    }
    return event
  },

  // Custom tags and context
  initialScope: {
    tags: {
      component: 'client',
      version: process.env.npm_package_version || '1.0.0',
    },
  },
})
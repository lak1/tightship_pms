// This file configures the initialization of Sentry on the server side
// The config you add here will be used whenever the server handles a request
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Environment configuration
  environment: process.env.NODE_ENV,

  // Performance Monitoring
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Custom error filtering
  beforeSend(event) {
    // Filter out certain errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send CSRF errors
      if (event.exception?.values?.[0]?.value?.includes('CSRF')) {
        return null
      }
      
      // Don't send rate limit errors (they're expected)
      if (event.exception?.values?.[0]?.value?.includes('Rate limit')) {
        return null
      }
    }
    
    return event
  },

  // Custom tags and context
  initialScope: {
    tags: {
      component: 'server',
      version: process.env.npm_package_version || '1.0.0',
    },
  },

  // Integration configuration
  integrations: [
    // Add Node.js specific integrations
    Sentry.nodeProfilingIntegration(),
  ],
})
import { z } from 'zod'

// Environment-specific configuration schema
const configSchema = z.object({
  // App basics
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3000),
  
  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  
  // Authentication
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  
  // Error tracking
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  
  // Rate limiting
  REDIS_URL: z.string().url().optional(),
  REDIS_TOKEN: z.string().optional(),
  DISABLE_RATE_LIMITING: z.coerce.boolean().default(false),
  
  // Email service
  RESEND_API_KEY: z.string().optional(),
  
  // Payment processing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  
  // Google integration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  
  // Loyverse integration
  LOYVERSE_CLIENT_ID: z.string().optional(),
  LOYVERSE_CLIENT_SECRET: z.string().optional(),
  LOYVERSE_REDIRECT_URI: z.string().url().optional(),
  
  // Feature flags
  ENABLE_SIGNUP: z.coerce.boolean().default(true),
  ENABLE_DEMO_ACCOUNT: z.coerce.boolean().default(false),
  MAINTENANCE_MODE: z.coerce.boolean().default(false),
  
  // Security
  ENFORCE_PRODUCTION_SECURITY: z.coerce.boolean().default(true),
  DEMO_ACCOUNT_EMAIL: z.string().email().optional(),
  DEMO_ACCOUNT_PASSWORD: z.string().optional(),
  
  // Performance
  DATABASE_CONNECTION_LIMIT: z.coerce.number().default(10),
  API_TIMEOUT: z.coerce.number().default(30000),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // File uploads
  MAX_FILE_SIZE: z.coerce.number().default(5 * 1024 * 1024), // 5MB
  UPLOAD_PATH: z.string().default('./uploads'),
})

export type Config = z.infer<typeof configSchema>

// Validate and parse environment variables
function createConfig(): Config {
  try {
    return configSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      throw new Error(`Environment configuration error:\n${missingFields.join('\n')}`)
    }
    throw error
  }
}

// Export the configuration
export const config = createConfig()

// Environment helpers
export const isDevelopment = config.NODE_ENV === 'development'
export const isProduction = config.NODE_ENV === 'production'
export const isTest = config.NODE_ENV === 'test'

// Feature flags
export const features = {
  signup: config.ENABLE_SIGNUP,
  demoAccount: config.ENABLE_DEMO_ACCOUNT && isDevelopment,
  maintenanceMode: config.MAINTENANCE_MODE,
  rateLimit: !config.DISABLE_RATE_LIMITING && !isTest,
  errorTracking: !!config.SENTRY_DSN && !isTest,
  email: !!config.RESEND_API_KEY,
  payments: !!config.STRIPE_SECRET_KEY,
  googleIntegration: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
  loyverseIntegration: !!(config.LOYVERSE_CLIENT_ID && config.LOYVERSE_CLIENT_SECRET),
}

// Database configuration
export const database = {
  url: config.DATABASE_URL,
  connectionLimit: config.DATABASE_CONNECTION_LIMIT,
}

// API configuration
export const api = {
  timeout: config.API_TIMEOUT,
  maxFileSize: config.MAX_FILE_SIZE,
  uploadPath: config.UPLOAD_PATH,
}

// Security configuration
export const security = {
  enforceProduction: config.ENFORCE_PRODUCTION_SECURITY,
  jwtSecret: config.JWT_SECRET,
  nextAuthSecret: config.NEXTAUTH_SECRET,
}

// Integration configurations
export const integrations = {
  sentry: {
    dsn: config.SENTRY_DSN,
    environment: config.SENTRY_ENVIRONMENT || config.NODE_ENV,
  },
  resend: {
    apiKey: config.RESEND_API_KEY,
  },
  stripe: {
    secretKey: config.STRIPE_SECRET_KEY,
    publishableKey: config.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: config.STRIPE_WEBHOOK_SECRET,
  },
  redis: {
    url: config.REDIS_URL,
    token: config.REDIS_TOKEN,
  },
  google: {
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: config.GOOGLE_REDIRECT_URI,
  },
  loyverse: {
    clientId: config.LOYVERSE_CLIENT_ID,
    clientSecret: config.LOYVERSE_CLIENT_SECRET,
    redirectUri: config.LOYVERSE_REDIRECT_URI,
  },
}

// Validation helpers
export function validateConfig() {
  const errors: string[] = []
  
  // Production-specific validations
  if (isProduction) {
    if (!config.SENTRY_DSN) {
      errors.push('SENTRY_DSN is required in production')
    }
    
    if (config.ENABLE_DEMO_ACCOUNT) {
      errors.push('Demo accounts should not be enabled in production')
    }
    
    if (!config.REDIS_URL && features.rateLimit) {
      errors.push('REDIS_URL is recommended for production rate limiting')
    }
  }
  
  // Feature-specific validations
  if (features.payments && !config.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET is required when Stripe is enabled')
  }
  
  if (features.googleIntegration && !config.GOOGLE_REDIRECT_URI) {
    errors.push('GOOGLE_REDIRECT_URI is required when Google integration is enabled')
  }
  
  if (features.loyverseIntegration && !config.LOYVERSE_REDIRECT_URI) {
    errors.push('LOYVERSE_REDIRECT_URI is required when Loyverse integration is enabled')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Export configuration summary for debugging
export function getConfigSummary() {
  return {
    environment: config.NODE_ENV,
    features,
    integrations: Object.fromEntries(
      Object.entries(integrations).map(([key, value]) => [
        key,
        Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, !!v])
        ),
      ])
    ),
  }
}

// Log configuration on startup (in development)
if (isDevelopment) {
  console.log('Configuration loaded:', getConfigSummary())
}
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { db } from './db'
import { rateLimiter, safeError } from './security'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'john@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Rate limiting based on IP address
        const clientIP = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || 'unknown'
        const rateLimitKey = `auth:${clientIP}:${credentials.email}`
        
        if (rateLimiter.isRateLimited(rateLimitKey, 5, 15 * 60 * 1000)) {
          safeError('Rate limit exceeded for authentication attempt', { 
            email: credentials.email, 
            ip: clientIP 
          })
          return null
        }

        const user = await db.users.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            organizations: true,
          },
        })

        if (!user || !user.isActive) {
          safeError('Authentication failed: user not found or inactive', { 
            email: credentials.email 
          })
          return null
        }

        // Validate password
        if (user.password) {
          // For regular users, check hashed password
          const isValidPassword = await compare(credentials.password, user.password)
          if (!isValidPassword) {
            safeError('Authentication failed: invalid password', { 
              email: credentials.email 
            })
            return null
          }
          
          // Reset rate limit on successful authentication
          rateLimiter.reset(rateLimitKey)
        } else if (
          // Only allow demo account in development with explicit configuration
          process.env.NODE_ENV === 'development' &&
          process.env.ENABLE_DEMO_ACCOUNT === 'true' &&
          process.env.DEMO_ACCOUNT_EMAIL &&
          process.env.DEMO_ACCOUNT_PASSWORD &&
          user.email === process.env.DEMO_ACCOUNT_EMAIL
        ) {
          // Check demo password from environment variable
          if (credentials.password !== process.env.DEMO_ACCOUNT_PASSWORD) {
            safeError('Authentication failed: invalid demo password', { 
              email: credentials.email 
            })
            return null
          }
          
          // Reset rate limit on successful demo authentication
          rateLimiter.reset(rateLimitKey)
        } else {
          // User has no password set, reject
          safeError('Authentication failed: user has no password set', { 
            email: credentials.email 
          })
          return null
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role,
          organizationId: user.organizationId,
          organization: user.organizations,
        }
      },
    }),
  ],
  callbacks: {
    session: ({ token, session }) => {
      if (token) {
        session.user.id = token.id
        session.user.name = token.name || ''
        session.user.email = token.email || ''
        session.user.role = token.role
        session.user.organizationId = token.organizationId
      }

      return session
    },
    jwt: ({ user, token }) => {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.organizationId = user.organizationId
      }

      return token
    },
  },
}
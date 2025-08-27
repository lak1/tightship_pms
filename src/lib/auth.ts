import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { db } from './db'

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            organization: true,
          },
        })

        if (!user || !user.isActive) {
          return null
        }

        // Validate password
        if (user.password) {
          // For regular users, check hashed password
          const isValidPassword = await compare(credentials.password, user.password)
          if (!isValidPassword) {
            return null
          }
        } else if (user.email === 'demo@tightship.com') {
          // For demo user (who might not have a password set), allow demo123
          if (credentials.password !== 'demo123') {
            return null
          }
        } else {
          // User has no password set, reject
          return null
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role,
          organizationId: user.organizationId,
          organization: user.organization,
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
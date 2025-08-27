import { UserRole } from '@prisma/client'
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: UserRole
      organizationId: string | null
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: UserRole
    organizationId: string | null
    organization?: {
      id: string
      name: string
      slug: string
    } | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    organizationId: string | null
  }
}
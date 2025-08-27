# Tightship Price Manager

A centralized pricing management system for restaurants to synchronize their menu prices across multiple platforms including Deliveroo, Uber Eats, ePOS systems, digital menus, and websites.

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui
- **Backend**: tRPC, NextAuth.js
- **Database**: PostgreSQL, Prisma ORM
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form, Zod validation
- **Charts**: Recharts

## 📋 Features

### Phase 1: Foundation ✅
- [x] Next.js 14 project setup with TypeScript
- [x] Prisma database schema with PostgreSQL
- [x] tRPC for type-safe API communication
- [x] NextAuth.js authentication setup
- [x] Tailwind CSS and Shadcn/ui components
- [x] Basic project structure

### Phase 2: Core Functionality (In Progress)
- [ ] Product management (CRUD operations)
- [ ] Multi-platform pricing
- [ ] Restaurant and menu management
- [ ] Price history tracking
- [ ] Bulk operations

### Phase 3: Platform Integrations
- [ ] Deliveroo API integration
- [ ] Uber Eats API integration
- [ ] Generic POS system connector
- [ ] Webhook handling
- [ ] Real-time synchronization

### Phase 4: Advanced Features
- [ ] Formula-based pricing
- [ ] Analytics and reporting
- [ ] Automated price rules
- [ ] Multi-location support
- [ ] Audit logging

## 🛠 Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Git

### Installation

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/tightship_pms"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-here"
   ```

3. **Set up the database**
   ```bash
   # Push the schema to your database
   pnpm db:push
   
   # Generate Prisma client
   pnpm db:generate
   
   # (Optional) Seed the database
   pnpm db:seed
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Run TypeScript type checking
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Prisma Studio
- `pnpm db:seed` - Seed the database

## 🏗 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Dashboard pages
├── components/            # Reusable UI components
├── lib/                   # Utilities and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   └── trpc.ts           # tRPC client
├── providers/             # React context providers
├── server/                # tRPC server
│   ├── routers/          # API route handlers
│   └── trpc.ts           # tRPC server setup
└── types/                 # TypeScript type definitions

prisma/
├── schema.prisma         # Database schema
└── seed.ts              # Database seeding script
```

## 🔑 Core Concepts

### Multi-tenant Architecture
- Organizations can have multiple restaurants
- Users belong to organizations with role-based access
- Data isolation at the organization level

### Temporal Pricing
- Price changes are tracked over time
- Each price has `effectiveFrom` and `effectiveTo` dates
- Historical pricing data is preserved

### Platform Integration
- Each restaurant can connect to multiple platforms
- Platform-specific pricing overrides base prices
- Synchronization jobs track sync status and history

### Price Control Types
- **Manual**: Prices set manually by users
- **Formula**: Prices calculated using formulas (e.g., cost + markup)
- **Market**: Prices determined by market conditions/competitors

## 🔌 API Documentation

The application uses tRPC for type-safe APIs. Key routers include:

### Restaurant Router
- `restaurant.list` - Get all restaurants for organization
- `restaurant.getById` - Get restaurant by ID
- `restaurant.create` - Create new restaurant
- `restaurant.update` - Update restaurant details

### Product Router
- `product.list` - Get products with pagination and filters
- `product.create` - Create new product
- `product.update` - Update product details
- `product.updatePrice` - Update product price for specific platform
- `product.getById` - Get product with pricing history
- `product.delete` - Soft delete product

## 🔧 Configuration

### Database Schema
The Prisma schema includes models for:
- User authentication (NextAuth.js compatible)
- Organizations and restaurants
- Menus, categories, and products
- Pricing with temporal support
- Platform integrations
- Sync jobs and history

### Authentication
- NextAuth.js with credentials provider
- JWT tokens with role-based claims
- Organization-scoped access control

### Environment Variables
See `.env.example` for all available configuration options.

## 📊 Database Schema Overview

Key entities and relationships:

```
Organization (1) → (n) Restaurant (1) → (n) Menu (1) → (n) Product
                ↓                                          ↓
              User                                     Price (temporal)
                                                          ↓
Platform ← Integration ← Restaurant              PlatformMapping
```

## 🗺 Roadmap

See [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md) for detailed development phases and [TECHNICAL_SPECIFICATION.md](../TECHNICAL_SPECIFICATION.md) for technical architecture details.

# Tightship Price Manager - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you get Tightship Price Manager up and running on your local machine for development.

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Git

### Step 1: Set Up Your Database

1. **Create a PostgreSQL database:**
   ```sql
   CREATE DATABASE tightship_pms;
   ```

2. **Update your environment variables:**
   Copy `.env.example` to `.env.local` and update the `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/tightship_pms"
   ```

### Step 2: Install Dependencies and Set Up Database

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Generate Prisma client
pnpm db:generate

# Seed with demo data (optional but recommended)
pnpm db:seed
```

### Step 3: Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🎯 Demo Data

If you ran the seed command, you now have:

### Demo Organization
- **Name**: Demo Restaurant Group
- **Restaurants**: 1 (The Gourmet Kitchen)

### Demo User
- **Email**: demo@tightship.com
- **Password**: Any password (authentication is simplified for demo)
- **Role**: Owner

### Sample Data
- **5 Products** across 4 categories (Starters, Mains, Desserts, Beverages)
- **5 Platforms** (Deliveroo, Uber Eats, Just Eat, Square POS, Website)
- **3 Tax Rates** (Standard VAT, Reduced VAT, Zero VAT)
- **2 Active Integrations** (Deliveroo, Uber Eats)
- **Platform-specific pricing** with 15% markup for delivery platforms

### Sample Products
1. **Truffle Arancini** - £8.50 (Starter)
2. **Pan-Seared Salmon** - £18.95 (Main)
3. **Chocolate Fondant** - £7.25 (Dessert)
4. **Craft Beer Selection** - £5.50 (Beverage)
5. **Margherita Pizza** - £12.50 (Main)

## 🔍 What to Try

1. **View Restaurant Dashboard**: See your restaurant overview with menu stats
2. **Browse Products**: Check out the product catalog with pricing
3. **Platform Pricing**: See how prices differ across platforms
4. **Integration Status**: View connected platforms and sync status

## 🛠 Development Tools

```bash
# Open Prisma Studio (database GUI)
pnpm db:studio

# Check TypeScript
pnpm type-check

# Format code
pnpm format

# Build for production
pnpm build
```

## 📱 Next Steps

Now that you have the basic setup running, you can:

1. **Explore the API**: Use tRPC for type-safe API calls
2. **Add Authentication**: Implement proper user authentication
3. **Create UI Components**: Build product management interfaces
4. **Add Platform Integrations**: Connect to real delivery platforms
5. **Implement Sync Logic**: Build real-time price synchronization

## 🆘 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check your DATABASE_URL in `.env.local`
- Verify database exists and user has permissions

### Build Errors
- Run `pnpm type-check` to see TypeScript errors
- Run `pnpm lint` to check for linting issues
- Make sure all dependencies are installed with `pnpm install`

### Seed Data Issues
- Ensure database schema is up to date with `pnpm db:push`
- Check if Prisma client is generated with `pnpm db:generate`

## 📚 Learn More

- [Development Plan](../DEVELOPMENT_PLAN.md) - Full roadmap and features
- [Technical Specification](../TECHNICAL_SPECIFICATION.md) - Architecture details
- [API Documentation](README.md#api-documentation) - tRPC router reference

## 🤝 Contributing

Ready to contribute? Check out our [Contributing Guidelines](README.md#contributing) in the main README.
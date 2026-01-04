# Infrastructure Setup Guide

Complete setup instructions for BullMQ job queues, Resend email service, and credential encryption.

## Table of Contents

1. [Redis Setup (Upstash)](#redis-setup-upstash)
2. [BullMQ Job Queues](#bullmq-job-queues)
3. [Resend Email Service](#resend-email-service)
4. [Credential Encryption](#credential-encryption)
5. [Worker Processes](#worker-processes)
6. [Monitoring & Debugging](#monitoring--debugging)

---

## Redis Setup (Upstash)

### Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database:
   - **Name**: tightship-queue
   - **Region**: Choose closest to your deployment (e.g., EU-West-1)
   - **Type**: Pay as you go (free tier available)
3. Once created, copy the **REST URL**

### Configure Environment Variables

Add to your `.env` file:

```bash
# Upstash Redis URL
UPSTASH_REDIS_URL="redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:PORT"
```

**Important:** Use the full Redis URL (not the REST API URL).

### Test Connection

```bash
# Start your development server
npm run dev

# The queue system will automatically test the connection on startup
# Check console for: "[Queue] Redis connection: OK"
```

---

## BullMQ Job Queues

### Queue Types

The application uses 6 different queues:

1. **menu-sync** - Menu synchronization with delivery platforms
2. **price-sync** - Price updates
3. **stock-sync** - Stock availability updates
4. **order-sync** - Order processing
5. **email** - Email notifications
6. **webhook** - Webhook event processing

### Priority Levels

Jobs are prioritized (1 = lowest, 5 = highest):

- **Priority 5**: Order sync (most urgent)
- **Priority 4**: Webhook processing
- **Priority 3**: Stock sync
- **Priority 2**: Price sync
- **Priority 1**: Menu sync, emails

### Job Configuration

- **Retry Attempts**: 3
- **Backoff Strategy**: Exponential (starts at 2 seconds)
- **Retention**:
  - Completed jobs: 24 hours (max 1000 jobs)
  - Failed jobs: 7 days
- **Concurrency**:
  - Menu sync: 3 concurrent jobs
  - Email: 10 concurrent jobs
  - Other queues: 5 concurrent jobs

### Adding Jobs

```typescript
import { addMenuSyncJob, addEmailJob } from '@/lib/queue/queues'

// Add menu sync job
await addMenuSyncJob({
  restaurantId: 'rest_123',
  menuId: 'menu_456',
  platformId: 'deliveroo',
  integrationId: 'int_789',
  syncType: 'FULL',
  languageCode: 'en',
})

// Add email job
await addEmailJob({
  to: 'user@example.com',
  template: 'SYNC_COMPLETE',
  subject: 'Menu Sync Complete',
  data: {
    restaurantName: 'My Restaurant',
    platformName: 'Deliveroo',
    categoriesUploaded: 5,
    itemsUploaded: 50,
    syncedAt: new Date().toISOString(),
  },
})
```

---

## Resend Email Service

### Setup Resend Account

1. Go to [Resend](https://resend.com/)
2. Sign up and verify your account
3. Add your domain:
   - Navigate to **Domains**
   - Click **Add Domain**
   - Enter your domain (e.g., `tightshippms.com`)
   - Add the required DNS records (SPF, DKIM, DMARC)
4. Create an API key:
   - Navigate to **API Keys**
   - Click **Create API Key**
   - Name: "Tightship Production"
   - Copy the API key

### Configure Environment Variables

Add to your `.env` file:

```bash
# Resend API Key
RESEND_API_KEY="re_YOUR_API_KEY_HERE"

# App URL (for email links)
NEXT_PUBLIC_APP_URL="https://tightshippms.com"
```

### Email Templates

The following templates are available:

1. **WELCOME** - New user welcome email
2. **SYNC_COMPLETE** - Menu sync success notification
3. **SYNC_FAILED** - Menu sync failure alert
4. **DUNNING** - Payment failure notification
5. **INVOICE** - Invoice receipt

### Test Email Sending

```typescript
import { addEmailJob } from '@/lib/queue/queues'

// Send test email
await addEmailJob({
  to: 'test@example.com',
  template: 'WELCOME',
  data: {
    userName: 'John',
    organizationName: 'Test Restaurant',
  },
})
```

### Domain Verification

Before sending emails in production:

1. Add DNS records provided by Resend
2. Wait for DNS propagation (up to 48 hours)
3. Verify domain in Resend dashboard
4. Test with a real email address

**Note:** In development, Resend allows sending to any email without domain verification.

---

## Credential Encryption

### Generate Encryption Key

```bash
# Generate a secure 32-byte encryption key
openssl rand -hex 32
```

This will output something like:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Configure Environment Variables

Add to your `.env` file:

```bash
# Encryption key for credentials (32-byte hex string)
ENCRYPTION_KEY="YOUR_64_CHARACTER_HEX_STRING_HERE"
```

**CRITICAL SECURITY NOTES:**

⚠️ **Never commit ENCRYPTION_KEY to version control**
⚠️ **Use different keys for development and production**
⚠️ **Store production key in secure vault (e.g., Vercel Environment Variables)**
⚠️ **If you lose this key, all encrypted credentials are unrecoverable**
⚠️ **Rotating this key requires re-encrypting all existing credentials**

### What Gets Encrypted

The following sensitive data is automatically encrypted:

- Integration access tokens
- Integration refresh tokens
- API client secrets
- OAuth credentials
- Private keys (for asymmetric auth)

### Encryption Algorithm

- **Algorithm**: AES-256-GCM
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 16 bytes (randomly generated per encryption)
- **Auth Tag**: 16 bytes (for integrity verification)
- **Format**: `iv:authTag:ciphertext` (base64 encoded)

### Migrate Existing Credentials

If you have existing unencrypted credentials in your database:

```bash
# Create a migration script
npm run db:migrate-encrypt-credentials
```

**Migration script** (`scripts/migrate-encrypt-credentials.ts`):

```typescript
import { db } from '@/lib/db'
import { encryptCredentials } from '@/lib/encryption'

async function migrateCredentials() {
  const integrations = await db.integrations.findMany()

  for (const integration of integrations) {
    const credentials = integration.credentials as Record<string, any>

    // Skip if already encrypted
    if (credentials && 'encrypted' in credentials && credentials.encrypted === true) {
      console.log(`Skipping ${integration.id} - already encrypted`)
      continue
    }

    // Encrypt credentials
    const encryptedCreds = encryptCredentials(credentials || {})

    // Update database
    await db.integrations.update({
      where: { id: integration.id },
      data: { credentials: encryptedCreds as any },
    })

    console.log(`✓ Encrypted credentials for integration ${integration.id}`)
  }

  console.log('Migration complete!')
}

migrateCredentials().catch(console.error)
```

---

## Worker Processes

### Starting Workers

Workers process jobs from the queues. You have two options:

#### Option 1: Separate Worker Process (Recommended for Production)

Create `worker.ts` in your project root:

```typescript
import { startMenuSyncWorker } from '@/lib/queue/workers/menuSyncWorker'
import { startEmailWorker } from '@/lib/queue/workers/emailWorker'

console.log('Starting BullMQ workers...')

const menuWorker = startMenuSyncWorker()
const emailWorker = startEmailWorker()

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing workers...')
  await menuWorker.close()
  await emailWorker.close()
  process.exit(0)
})
```

Then run:
```bash
tsx worker.ts
```

#### Option 2: Embedded in Next.js (Development Only)

Add to `app/api/workers/route.ts`:

```typescript
import { startMenuSyncWorker } from '@/lib/queue/workers/menuSyncWorker'
import { startEmailWorker } from '@/lib/queue/workers/emailWorker'

let workersStarted = false

export async function GET() {
  if (!workersStarted) {
    startMenuSyncWorker()
    startEmailWorker()
    workersStarted = true
  }

  return Response.json({ status: 'Workers running' })
}
```

### Production Deployment

**Vercel/Netlify (Serverless):**
- Workers cannot run in serverless environment
- Use a separate server (Railway, Render, Fly.io) for workers
- Or use Vercel Background Functions (Pro plan)

**Railway/Render/Fly.io:**
1. Deploy your app normally
2. Add a `Procfile`:
   ```
   web: npm start
   worker: tsx worker.ts
   ```
3. Scale workers:
   ```bash
   # Railway
   railway up --service worker

   # Render
   # Create a "Background Worker" service

   # Fly.io
   fly scale count worker=2
   ```

---

## Monitoring & Debugging

### Queue Stats

Get queue statistics:

```typescript
import { getQueueStats, menuSyncQueue } from '@/lib/queue/queues'

const stats = await getQueueStats(menuSyncQueue)
console.log(stats)
// {
//   waiting: 5,
//   active: 2,
//   completed: 100,
//   failed: 3,
//   delayed: 0,
//   total: 7
// }
```

### View Jobs in Redis

Use Upstash Console:
1. Go to Upstash Console
2. Select your database
3. Navigate to **Data Browser**
4. Search for keys: `bull:menu-sync:*`

### BullBoard (Optional Dashboard)

Install BullBoard for a web UI:

```bash
npm install @bull-board/api @bull-board/ui @bull-board/express
```

Create `app/api/admin/queues/route.ts`:

```typescript
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { menuSyncQueue, emailQueue } from '@/lib/queue/queues'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/api/admin/queues')

createBullBoard({
  queues: [
    new BullMQAdapter(menuSyncQueue),
    new BullMQAdapter(emailQueue),
  ],
  serverAdapter,
})

export const GET = serverAdapter.registerPlugin()
```

Access at: `http://localhost:3000/api/admin/queues`

### Debugging Failed Jobs

```typescript
import { menuSyncQueue } from '@/lib/queue/queues'

// Get failed jobs
const failed = await menuSyncQueue.getFailed()

// Retry a specific failed job
await failed[0].retry()

// Retry all failed jobs
const failedJobs = await menuSyncQueue.getFailed()
await Promise.all(failedJobs.map(job => job.retry()))

// Remove failed jobs
await menuSyncQueue.clean(0, 1000, 'failed')
```

---

## Environment Variables Summary

```bash
# Redis (Upstash)
UPSTASH_REDIS_URL="redis://default:password@endpoint.upstash.io:port"

# Resend Email
RESEND_API_KEY="re_YOUR_API_KEY"

# Encryption
ENCRYPTION_KEY="64_character_hex_string"

# App URL
NEXT_PUBLIC_APP_URL="https://tightshippms.com"
```

---

## Testing

### Test Queue System

```bash
# Add a test job
curl -X POST http://localhost:3000/api/test/queue \
  -H "Content-Type: application/json" \
  -d '{"type": "menu-sync"}'
```

### Test Email Sending

```bash
# Send test email
curl -X POST http://localhost:3000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "template": "WELCOME"}'
```

### Test Encryption

```bash
# Test encryption/decryption
node -e "
const { encrypt, decrypt } = require('./src/lib/encryption');
const plaintext = 'secret_token_12345';
const encrypted = encrypt(plaintext);
const decrypted = decrypt(encrypted);
console.log('Original:', plaintext);
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', plaintext === decrypted);
"
```

---

## Troubleshooting

### Redis Connection Issues

**Error**: "Connection refused" or "ECONNREFUSED"

**Solution**:
1. Verify `UPSTASH_REDIS_URL` is correct
2. Check Upstash database is active
3. Ensure no firewall blocking the connection
4. Test connection: `redis-cli -u $UPSTASH_REDIS_URL ping`

### Email Sending Fails

**Error**: "Domain not verified"

**Solution**:
1. Verify domain in Resend dashboard
2. Check DNS records are properly configured
3. Wait for DNS propagation (up to 48 hours)
4. Use sandbox mode for testing (`@resend.dev` emails)

### Encryption Errors

**Error**: "ENCRYPTION_KEY environment variable is not set"

**Solution**:
1. Generate key: `openssl rand -hex 32`
2. Add to `.env` file
3. Restart application

**Error**: "Invalid encrypted data format"

**Solution**:
- Encrypted data may be corrupted
- ENCRYPTION_KEY may have changed
- Try decrypting with backup key if available

---

## Best Practices

1. **Queue Management**
   - Monitor queue sizes regularly
   - Set up alerts for failed jobs
   - Clean up old completed jobs periodically

2. **Email Delivery**
   - Use templates for consistency
   - Test emails before production
   - Monitor delivery rates in Resend dashboard
   - Set up SPF, DKIM, and DMARC records

3. **Security**
   - Rotate encryption keys annually
   - Store production keys in secure vaults
   - Never log decrypted credentials
   - Use environment-specific keys

4. **Performance**
   - Scale workers based on queue size
   - Adjust concurrency limits for your infrastructure
   - Use separate Redis instances for prod/dev
   - Monitor Redis memory usage

---

**Last Updated:** 2026-01-04
**Stack:** BullMQ + Upstash Redis + Resend + AES-256-GCM

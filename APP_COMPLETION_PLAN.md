# Tightship PMS - Application Completion Plan
## Path to Production Launch

**Created:** January 4, 2026
**Current Status:** 75% Complete - Core features solid, integrations needed

---

## Executive Summary

The Tightship PMS application has:
- ✅ **Strong Foundation:** Auth, subscriptions, payments, core features complete
- ✅ **Advanced Features:** Menu designer (50+ templates), label printing, allergen management
- ✅ **Payment System:** Stripe fully integrated with 4-tier pricing
- ⚠️ **Critical Gap:** Delivery platform integrations (Deliveroo, Uber Eats) not implemented
- ⚠️ **Medium Gap:** Notification system incomplete, job queue missing

**Estimated Time to Launch:** 6-8 weeks (1 developer)

---

## Phase 6: Critical Integrations (Weeks 1-3) 🔴 BLOCKING

### Priority 1: Deliveroo Integration (Week 1)

**Goal:** Enable menu sync to Deliveroo platform

**Tasks:**
1. **Research Deliveroo API** (4 hours)
   - Review Deliveroo Partner API documentation
   - Understand OAuth flow
   - Identify menu sync endpoints
   - Document rate limits and requirements

2. **Create Integration Files** (8 hours)
   - `/src/lib/integrations/deliveroo/client.ts` - API client
   - `/src/lib/integrations/deliveroo/config.ts` - Configuration
   - `/src/lib/integrations/deliveroo/types.ts` - TypeScript types
   - `/src/lib/integrations/deliveroo/menuSync.ts` - Menu sync logic

3. **OAuth Implementation** (6 hours)
   - `/src/app/api/integrations/deliveroo/auth/route.ts`
   - `/src/app/api/integrations/deliveroo/callback/route.ts`
   - `/src/app/api/integrations/deliveroo/disconnect/route.ts`
   - Token storage in `integrations` table

4. **Menu Sync Implementation** (10 hours)
   - Product mapping to Deliveroo format
   - Category sync
   - Pricing sync
   - Availability sync
   - Error handling and retry logic

5. **Testing & Documentation** (4 hours)
   - Create test restaurant on Deliveroo
   - End-to-end sync testing
   - Write `DELIVEROO_INTEGRATION.md`

**Files to Create:** 8 files
**Estimated Time:** 32 hours (4 days)

---

### Priority 2: Uber Eats Integration (Week 2)

**Goal:** Enable menu sync to Uber Eats platform

**Tasks:**
1. **Research Uber Eats API** (4 hours)
   - Review Uber Eats Restaurant Manager API
   - Understand authentication (likely OAuth 2.0)
   - Identify menu management endpoints
   - Document requirements

2. **Create Integration Files** (8 hours)
   - `/src/lib/integrations/ubereats/client.ts` - API client
   - `/src/lib/integrations/ubereats/config.ts` - Configuration
   - `/src/lib/integrations/ubereats/types.ts` - TypeScript types
   - `/src/lib/integrations/ubereats/menuSync.ts` - Menu sync logic

3. **OAuth Implementation** (6 hours)
   - `/src/app/api/integrations/ubereats/auth/route.ts`
   - `/src/app/api/integrations/ubereats/callback/route.ts`
   - `/src/app/api/integrations/ubereats/disconnect/route.ts`

4. **Menu Sync Implementation** (10 hours)
   - Product mapping to Uber Eats format
   - Category hierarchy sync
   - Pricing and modifiers
   - Item availability
   - Image upload support

5. **Testing & Documentation** (4 hours)
   - Create test restaurant on Uber Eats
   - End-to-end testing
   - Write `UBEREATS_INTEGRATION.md`

**Files to Create:** 8 files
**Estimated Time:** 32 hours (4 days)

---

### Priority 3: Loyverse Phase 2-3 Completion (Week 3)

**Goal:** Complete Loyverse data sync (Phase 1 OAuth already done)

**Tasks:**
1. **Product Import from Loyverse** (8 hours)
   - Fetch products from Loyverse API
   - Map to Tightship product schema
   - Handle variants and modifiers
   - Batch import capability
   - Router: `/src/server/routers/loyverse.ts`

2. **Category Sync** (4 hours)
   - Sync category hierarchy
   - Map to Tightship categories
   - Handle missing mappings

3. **Price Sync** (6 hours)
   - Import prices from Loyverse
   - Update existing product prices
   - Price history tracking

4. **Two-Way Sync** (8 hours)
   - Push Tightship changes to Loyverse
   - Conflict resolution strategy
   - Last-modified timestamp tracking

5. **Sync UI** (6 hours)
   - Sync status dashboard
   - Manual sync trigger
   - Sync history view
   - Error logs display

**Files to Modify/Create:** 5 files
**Estimated Time:** 32 hours (4 days)

---

## Phase 7: Infrastructure & Notifications (Week 4) 🟡 HIGH PRIORITY

### Task 1: Job Queue Implementation (16 hours)

**Goal:** Replace direct sync with background job processing

**Implementation:**
- **Library:** BullMQ (Redis-based, production-ready)
- **Install:** `npm install bullmq ioredis`
- **Files to Create:**
  - `/src/lib/queue/client.ts` - BullMQ client setup
  - `/src/lib/queue/workers/menuSync.ts` - Menu sync worker
  - `/src/lib/queue/workers/priceSync.ts` - Price sync worker
  - `/src/lib/queue/jobs/sync.ts` - Job definitions
  - `/src/app/api/queue/webhook/route.ts` - Queue status webhook

**Benefits:**
- Async processing of long-running syncs
- Retry failed jobs automatically
- Rate limit compliance
- Better error handling
- Job monitoring

**Configuration:**
```typescript
// Add to .env
REDIS_URL=redis://localhost:6379
QUEUE_CONCURRENCY=5
```

---

### Task 2: Email Notification System (12 hours)

**Goal:** Complete dunning and notification emails

**Tasks:**
1. **Email Service Setup** (4 hours)
   - Choose provider: Resend (recommended, free tier) or SendGrid
   - Install: `npm install resend`
   - Create `/src/lib/services/email.ts`
   - Email templates directory: `/src/emails/`

2. **Dunning Notifications** (4 hours)
   - Payment failed email
   - Retry notification
   - Subscription cancellation warning
   - Reactivation success email
   - Complete TODOs in `/src/lib/services/dunning.ts`

3. **Transactional Emails** (4 hours)
   - Welcome email on signup
   - Integration connected/disconnected
   - Sync success/failure notifications
   - Weekly sync summary

**Templates to Create:**
- `welcome.tsx` (React Email)
- `payment-failed.tsx`
- `subscription-cancelled.tsx`
- `sync-complete.tsx`
- `sync-failed.tsx`

---

### Task 3: OAuth Token Encryption (4 hours)

**Goal:** Encrypt OAuth tokens in production (security requirement)

**Tasks:**
1. Install encryption library: `npm install @47ng/cloak`
2. Create `/src/lib/crypto/encryption.ts`
3. Update Google router token storage (line 147-148)
4. Update all OAuth callback handlers
5. Migration script for existing tokens

**Code:**
```typescript
import { encrypt, decrypt } from '@47ng/cloak'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // 32-byte key

export function encryptToken(token: string): string {
  return encrypt(token, ENCRYPTION_KEY)
}

export function decryptToken(encrypted: string): string {
  return decrypt(encrypted, ENCRYPTION_KEY)
}
```

---

## Phase 8: Polish & User Experience (Week 5) 🟢 MEDIUM PRIORITY

### Task 1: Homepage Enhancement (8 hours)

**Current State:** Landing page exists but could be enhanced

**Improvements:**
1. **Hero Section** (2 hours)
   - Add animated demo/screenshot
   - Social proof (testimonials)
   - Trust badges (security, uptime)

2. **Features Section** (2 hours)
   - Integration logos showcase
   - Feature comparison table
   - Use case scenarios

3. **SEO Optimization** (2 hours)
   - Meta tags
   - Open Graph tags
   - Structured data (JSON-LD)
   - Sitemap generation

4. **Performance** (2 hours)
   - Image optimization
   - Lazy loading
   - Code splitting

**Files to Modify:**
- `/src/components/marketing/landing-page.tsx`
- `/src/app/layout.tsx` (add metadata)
- Create `/public/sitemap.xml`

---

### Task 2: Team Management UI (10 hours)

**Goal:** Complete team member management

**Tasks:**
1. **Team Members Page** (4 hours)
   - `/src/app/team/page.tsx`
   - List all organization members
   - Role badges
   - Last active timestamp

2. **Invite Team Member** (3 hours)
   - `/src/app/team/invite/page.tsx`
   - Email invitation form
   - Role selection
   - Router: `/src/server/routers/team.ts` (create mutation)

3. **Member Management** (3 hours)
   - Edit member role
   - Remove member
   - Resend invitation
   - Permission checking

**Database:** Tables already exist (`users`, `organizations`)

---

### Task 3: Analytics Dashboard Enhancement (8 hours)

**Goal:** Add meaningful metrics to analytics page

**Metrics to Add:**
1. **Sync Performance** (3 hours)
   - Successful syncs vs failed
   - Average sync time
   - Platform-wise breakdown
   - Chart: Sync history over time

2. **Menu Performance** (3 hours)
   - Most synced products
   - Price change frequency
   - Products by platform
   - Chart: Product distribution

3. **Subscription Metrics** (2 hours)
   - Usage vs limits (restaurants, products, API calls)
   - Upgrade suggestions
   - Cost analysis

**Files:**
- `/src/app/analytics/page.tsx` (enhance)
- `/src/server/routers/analytics.ts` (create)
- Add Chart.js: `npm install react-chartjs-2 chart.js`

---

## Phase 9: Just Eat Integration (Week 6) 🟡 OPTIONAL

**Status:** Lower priority (can defer post-launch)

**Tasks:** (Same pattern as Deliveroo/Uber Eats)
1. Research Just Eat API (4 hours)
2. Create integration files (8 hours)
3. OAuth implementation (6 hours)
4. Menu sync implementation (10 hours)
5. Testing & documentation (4 hours)

**Estimated Time:** 32 hours (4 days)

**Decision:** Implement if Deliveroo/Uber Eats complete with time to spare

---

## Phase 10: Testing & QA (Week 7) 🔵 CRITICAL

### Task 1: Integration Testing (16 hours)

**Test Scenarios:**
1. **Deliveroo End-to-End** (4 hours)
   - Connect restaurant
   - Sync full menu
   - Update prices
   - Disconnect and verify cleanup

2. **Uber Eats End-to-End** (4 hours)
   - Same as Deliveroo

3. **Loyverse Import** (4 hours)
   - Import products from real Loyverse account
   - Verify data accuracy
   - Test conflict resolution

4. **Payment Flow** (4 hours)
   - Stripe checkout (all plans)
   - Subscription upgrades/downgrades
   - Payment failure handling
   - Dunning process

---

### Task 2: Security Audit (8 hours)

**Checklist:**
1. **Authentication** (2 hours)
   - Test session hijacking prevention
   - Verify CSRF protection
   - Check password requirements

2. **Authorization** (2 hours)
   - Test RLS policies (if implemented)
   - Verify organization isolation
   - Check role-based access

3. **Data Protection** (2 hours)
   - Verify OAuth token encryption
   - Check sensitive data handling
   - Test API rate limiting

4. **Infrastructure** (2 hours)
   - Review environment variables
   - Check HTTPS enforcement
   - Verify CORS settings

**Output:** `SECURITY_AUDIT.md` report

---

### Task 3: Performance Testing (8 hours)

**Tests:**
1. **Database Queries** (3 hours)
   - Identify N+1 queries
   - Add missing indexes
   - Optimize slow queries

2. **API Response Times** (3 hours)
   - Measure endpoint performance
   - Add caching where needed
   - Optimize large data fetches

3. **Frontend Performance** (2 hours)
   - Lighthouse audit
   - Core Web Vitals
   - Bundle size analysis

**Tools:**
- Prisma query logging
- Next.js built-in analytics
- Chrome DevTools

---

## Phase 11: Production Deployment (Week 8) 🚀 LAUNCH

### Task 1: Environment Setup (8 hours)

**Infrastructure:**
1. **Hosting Setup** (3 hours)
   - Vercel (recommended) or Railway
   - Configure environment variables
   - Set up domains

2. **Database** (2 hours)
   - Supabase production instance
   - Connection pooling
   - Backup strategy

3. **Redis** (1 hour)
   - Upstash Redis (serverless, free tier)
   - For job queue and rate limiting

4. **Monitoring** (2 hours)
   - Sentry production project
   - Uptime monitoring (UptimeRobot)
   - Log aggregation (Logtail)

---

### Task 2: Pre-Launch Checklist (6 hours)

**Critical Items:**
- [ ] All integration OAuth credentials (production)
- [ ] Stripe production keys configured
- [ ] Email sending configured (Resend production)
- [ ] Database migrations applied
- [ ] Seed data loaded (subscription plans, platforms)
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] Error tracking active (Sentry)
- [ ] Backup strategy tested
- [ ] Domain configured
- [ ] Privacy policy & Terms of Service pages
- [ ] GDPR compliance (data export/deletion)

---

### Task 3: Soft Launch (2 hours)

**Steps:**
1. Deploy to production
2. Invite 5-10 beta users
3. Monitor error logs
4. Collect feedback
5. Fix critical bugs

---

### Task 4: Marketing Launch (Ongoing)

**Activities:**
- Product Hunt launch
- Social media announcement
- Email existing waitlist
- Restaurant industry forums
- Content marketing (blog posts)

---

## Additional Nice-to-Haves (Post-Launch)

### Low Priority Enhancements:

1. **API Documentation Portal** (16 hours)
   - Interactive API docs (Swagger/OpenAPI)
   - Code examples
   - Authentication guide

2. **Advanced Reporting** (16 hours)
   - Custom report builder
   - Export to CSV/PDF
   - Scheduled reports via email

3. **Mobile App** (80+ hours)
   - React Native app
   - Menu management on mobile
   - Push notifications

4. **White-Label Solution** (40+ hours)
   - Custom branding per organization
   - Custom domains
   - Branded emails

5. **Multi-Language Support** (24 hours)
   - i18n implementation
   - Menu translation features
   - RTL language support

6. **Square POS Integration** (32 hours)
   - If there's demand

---

## Risk Management

### High Risk Items:

1. **Deliveroo/Uber Eats API Access**
   - **Risk:** May require business verification, approval process
   - **Mitigation:** Start application process immediately, have fallback plan
   - **Fallback:** Launch with Loyverse + Google only, add delivery platforms post-launch

2. **Redis/Queue Infrastructure**
   - **Risk:** Added complexity, potential costs
   - **Mitigation:** Use Upstash serverless Redis (free tier), simple BullMQ setup
   - **Fallback:** Defer to post-launch if blocking

3. **Email Deliverability**
   - **Risk:** Emails may go to spam
   - **Mitigation:** Use Resend (high deliverability), warm up domain, SPF/DKIM setup
   - **Fallback:** Use transactional email service with proven track record

### Medium Risk Items:

1. **Performance at Scale**
   - **Risk:** Slow queries with large datasets
   - **Mitigation:** Database indexing, query optimization, caching
   - **Monitoring:** Set up alerts for slow queries

2. **Third-Party API Changes**
   - **Risk:** Platform APIs may change without notice
   - **Mitigation:** Version pinning, comprehensive error handling
   - **Monitoring:** Alert on sync failures

---

## Success Metrics

### Launch Criteria (All must be ✅):
- [ ] Deliveroo integration working end-to-end
- [ ] Uber Eats integration working end-to-end
- [ ] Loyverse import working
- [ ] Stripe payments processing correctly
- [ ] Email notifications sending
- [ ] Job queue processing syncs
- [ ] OAuth tokens encrypted
- [ ] Security audit passed
- [ ] 5 beta users successfully onboarded
- [ ] Zero critical bugs in production

### Post-Launch KPIs (30 days):
- 50+ registered restaurants
- 80%+ successful sync rate
- <5% churn rate
- 10+ paying customers
- <1 hour average support response time

---

## Timeline Summary

| Week | Phase | Focus | Blocking |
|------|-------|-------|----------|
| 1 | Phase 6.1 | Deliveroo Integration | 🔴 YES |
| 2 | Phase 6.2 | Uber Eats Integration | 🔴 YES |
| 3 | Phase 6.3 | Loyverse Phase 2-3 | 🔴 YES |
| 4 | Phase 7 | Infrastructure (Queue, Email, Encryption) | 🟡 HIGH |
| 5 | Phase 8 | Polish (Homepage, Team, Analytics) | 🟢 MEDIUM |
| 6 | Phase 9 | Just Eat (Optional) | ⚪ OPTIONAL |
| 7 | Phase 10 | Testing & QA | 🔵 CRITICAL |
| 8 | Phase 11 | Production Deployment | 🚀 LAUNCH |

**Total Estimated Time:** 6-8 weeks (1 full-time developer)

---

## Budget Considerations

### Required Services (Production):
- **Hosting:** Vercel Pro ($20/month) or free hobby tier
- **Database:** Supabase Pro ($25/month) - current free tier may suffice initially
- **Redis:** Upstash serverless (Free tier: 10K requests/day)
- **Email:** Resend (Free tier: 3K emails/month, then $20/month)
- **Monitoring:** Sentry (Free tier: 5K errors/month)
- **Domain:** $12/year

**Minimum Monthly Cost:** $45-$65 (can start with $0 using free tiers)

### Optional Services:
- **Error Tracking Pro:** Sentry Team ($29/month)
- **Uptime Monitoring:** UptimeRobot Pro ($7/month)
- **CDN:** Cloudflare (Free)

---

## Conclusion

The Tightship PMS application is **75% complete** with a strong foundation. The critical path to launch focuses on:

1. **Delivery Platform Integrations** (3 weeks) - Unblock core value proposition
2. **Infrastructure Hardening** (1 week) - Production-ready async processing
3. **Polish & Testing** (2 weeks) - Professional UX and reliability
4. **Launch** (2 weeks) - Deploy and onboard beta users

With focused execution, the application can be production-ready in **6-8 weeks**.

---

## Next Steps

**Immediate Actions (This Week):**
1. ✅ Review and approve this plan
2. 🔴 Apply for Deliveroo Partner API access
3. 🔴 Apply for Uber Eats Restaurant Manager API access
4. 🟡 Set up Resend account for emails
5. 🟡 Set up Upstash Redis account
6. 📋 Create GitHub project board with tasks
7. 🎯 Start Phase 6.1: Deliveroo Integration

**Questions to Resolve:**
- Do you have existing relationships with Deliveroo/Uber Eats for API access?
- Target launch date preference?
- Beta user recruitment strategy?
- Marketing budget for launch?

Ready to get started! 🚀

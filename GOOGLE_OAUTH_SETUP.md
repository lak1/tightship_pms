# Google Business Profile OAuth Setup Guide

Follow these steps to enable Google Business Profile integration in TightShip PMS.

## 1. Google Cloud Console Setup

### Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Name it something like "TightShip PMS Integration"

### Enable Required APIs
Enable these APIs in the [Google Cloud Console API Library](https://console.cloud.google.com/apis/library):
- **Google My Business Business Information API**
- **Google My Business Account Management API** 
- **Google My Business Business Calls API** (optional, for call tracking)

### Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: TightShip PMS Google Integration
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://your-production-domain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google/callback` (development)
     - `https://your-production-domain.com/api/auth/google/callback` (production)

### Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** (unless using Google Workspace)
3. Fill in required information:
   - **App name**: TightShip PMS
   - **User support email**: Your email
   - **App logo**: Upload TightShip logo (optional)
   - **App domain**: Your domain
   - **Developer contact**: Your email

4. **Scopes**: Add these scopes:
   - `https://www.googleapis.com/auth/business.manage`
   - `profile`
   - `email`

5. **Test users**: Add your email and any test restaurant owners

## 2. Environment Variables

Add these to your `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Production example:
# GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

## 3. Required NPM Packages

Install Google authentication library:

```bash
npm install google-auth-library
```

## 4. Database Migration

Run the Prisma migration to create Google integration tables:

```bash
npx prisma migrate dev --name add_google_business_profile_integration
npx prisma generate
```

## 5. Testing the Integration

### Development Testing:
1. Start your development server: `npm run dev`
2. Go to a restaurant page in your PMS
3. Look for "Google Business Profile" integration section
4. Click "Connect Google Account"
5. Complete OAuth flow
6. Test the "Sync Now" functionality

### Verification Steps:
- [ ] OAuth flow redirects correctly
- [ ] Tokens are stored in database
- [ ] Google My Business locations are detected
- [ ] Menu sync test works
- [ ] Error handling works (try disconnecting internet)

## 6. Production Deployment

### Before going live:
1. **Verify OAuth consent screen** is properly configured
2. **Update redirect URIs** to production domain
3. **Enable API quotas** appropriate for your usage
4. **Set up monitoring** for API rate limits
5. **Test with real restaurant Google Business Profiles**

### Security Considerations:
- [ ] Encrypt stored OAuth tokens in database
- [ ] Implement token rotation
- [ ] Set up API rate limiting
- [ ] Monitor for suspicious API usage
- [ ] Implement proper error logging

## 7. API Quotas and Limits

Google My Business API has these limits:
- **Requests per day**: 50,000 (can request increase)
- **Requests per 100 seconds per user**: 1,500
- **Requests per 100 seconds**: 15,000

### Rate Limiting Strategy:
- Cache menu data for 5-10 minutes
- Batch updates when possible
- Implement exponential backoff
- Queue sync requests during high usage

## 8. User Flow

### Restaurant Owner Experience:
1. **Setup**: Owner clicks "Connect Google Business Profile"
2. **OAuth**: Redirected to Google, grants permissions
3. **Location Selection**: System auto-detects their business location
4. **Confirmation**: Shows successful connection
5. **Auto-sync**: Menu updates automatically sync to Google

### Ongoing Usage:
- Menu changes in TightShip → Auto-sync to Google (5-min delay)
- Manual sync option available
- Sync history and status visible
- Error notifications if sync fails

## 9. Troubleshooting

### Common Issues:

**"Access blocked" error**:
- Verify OAuth consent screen is published
- Check if user email is added to test users (during development)

**"Redirect URI mismatch"**:
- Ensure redirect URI in Google Console matches exactly
- Check for trailing slashes or http vs https

**"Insufficient permissions"**:
- Verify required scopes are configured
- User may need to re-authorize if scopes changed

**"Location not found"**:
- User may not have Google My Business account
- Business may not be verified on Google
- Multiple locations may require manual selection

### Debug Steps:
1. Check Google Cloud Console logs
2. Verify environment variables
3. Test OAuth flow in incognito mode
4. Check database for stored tokens
5. Test Google API calls directly

## 10. Support Documentation

Link users to:
- [Google My Business Help](https://support.google.com/business)
- [How to verify business on Google](https://support.google.com/business/answer/7107242)
- [Google My Business API documentation](https://developers.google.com/my-business)

This integration will be a major competitive advantage for TightShip PMS!
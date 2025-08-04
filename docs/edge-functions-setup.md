# Edge Functions Setup Guide

## Problem: 500 Error on send-email Function

The 500 error when sending invitations occurs because the edge function is either not deployed or missing required environment variables.

## Solution Steps

### 1. Deploy Edge Functions

Run the deployment script:
```bash
./scripts/deploy-edge-functions.sh
```

Or deploy manually using Supabase CLI:
```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Link your project (you'll need your project ID)
supabase link --project-ref jxlxtzkmicfhchkhiojz

# Deploy the send-email function
supabase functions deploy send-email --no-verify-jwt
```

### 2. Set Environment Variables

The send-email function requires the following environment variables to be set in your Supabase Dashboard:

#### Required Variables:
- **RESEND_API_KEY**: Your Resend API key for sending emails
  - Get one at: https://resend.com/api-keys
  - Or use a test key for development

- **PUBLIC_SITE_URL**: Your application URL
  - Development: `http://localhost:5173`
  - Production: Your deployed URL (e.g., `https://esynyc-lessonlibrary-v2.netlify.app`)

- **ALLOWED_ORIGINS**: Comma-separated list of allowed CORS origins
  - Example: `http://localhost:5173,https://esynyc-lessonlibrary-v2.netlify.app`

#### How to Set Environment Variables:
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions** in the sidebar
4. Click on the `send-email` function
5. Go to the **Settings** tab
6. Add the environment variables

### 3. Alternative: Development Mode Without Email

If you don't have a Resend API key yet, the function will work in development mode:
- Without RESEND_API_KEY, the function logs email details instead of sending
- The invitation link is stored in `window._lastInvitationLink` in development
- Check browser console for the invitation link after creating an invite

### 4. Test the Function

After deployment and configuration:
1. Go to the Admin Users page
2. Click "Invite User"
3. Fill in the form and submit
4. Check if the email is sent successfully

### 5. Troubleshooting

If you still get errors:

1. **Check function logs**:
   ```bash
   supabase functions logs send-email
   ```

2. **Test function directly**:
   ```bash
   curl -X POST https://jxlxtzkmicfhchkhiojz.supabase.co/functions/v1/send-email \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"type":"invitation","to":"test@example.com","data":{}}'
   ```

3. **Common issues**:
   - Missing RESEND_API_KEY: Function returns success but logs email instead
   - Invalid RESEND_API_KEY: Function returns 500 with Resend API error
   - CORS issues: Check ALLOWED_ORIGINS includes your current domain

## Email Templates

The function supports these email types:
- `invitation`: New user invitations
- `welcome`: Welcome email after account creation
- `password-reset`: Password reset requests
- `password-changed`: Password change confirmations
- `role-changed`: Role update notifications
- `account-deactivated`: Account deactivation notices
- `account-reactivated`: Account reactivation notices

## Using Resend for Email

1. Sign up at [Resend.com](https://resend.com)
2. Create an API key
3. Add the key to your Supabase Edge Function environment
4. The function uses `onboarding@resend.dev` as the sender (for testing)
5. For production, verify your domain and use your own sender address
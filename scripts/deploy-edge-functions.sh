#!/bin/bash

# Deploy Edge Functions to Supabase
# This script deploys all edge functions to your Supabase project

echo "🚀 Deploying Edge Functions to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Deploy send-email function
echo "📧 Deploying send-email function..."
supabase functions deploy send-email \
  --no-verify-jwt

# Deploy other functions
echo "👥 Deploying user-management function..."
supabase functions deploy user-management \
  --no-verify-jwt

echo "📨 Deploying invitation-management function..."
supabase functions deploy invitation-management \
  --no-verify-jwt

echo "🔐 Deploying password-reset function..."
supabase functions deploy password-reset \
  --no-verify-jwt

echo "✅ All functions deployed successfully!"
echo ""
echo "⚠️  Important: Make sure to set the following environment variables in Supabase Dashboard:"
echo "   - RESEND_API_KEY (for email sending)"
echo "   - PUBLIC_SITE_URL (your site URL)"
echo "   - ALLOWED_ORIGINS (comma-separated list of allowed origins)"
echo ""
echo "📝 To set environment variables:"
echo "   1. Go to your Supabase Dashboard"
echo "   2. Navigate to Edge Functions"
echo "   3. Click on your function"
echo "   4. Go to 'Settings' tab"
echo "   5. Add environment variables"
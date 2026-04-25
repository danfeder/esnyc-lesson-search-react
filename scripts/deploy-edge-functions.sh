#!/bin/bash

# Deploy Edge Functions to Supabase (manual / break-glass)
#
# Prefer the GitHub workflow for routine deploys — it deploys to TEST on PRs
# and to PROD from main with manual approval, so code never skips the test
# environment the way this script does.

set -e

echo "⚠️  This script bypasses CI and deploys directly to PROD from your laptop."
echo "   Prefer the GitHub workflow for routine deploys:"
echo "     gh workflow run deploy-edge-functions.yml --field environment=test"
echo "     gh workflow run deploy-edge-functions.yml --field environment=production"
echo ""
read -r -p "Continue with manual deploy? (y/N) " reply
echo
case "$reply" in
    [yY]|[yY][eE][sS]) ;;
    *) echo "Aborted."; exit 1 ;;
esac

echo "🚀 Deploying Edge Functions to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# List of all edge functions to deploy
FUNCTIONS=(
    "detect-duplicates"
    "extract-google-doc"
    "generate-embeddings"
    "generate-gemini-embeddings"
    "import-lessons"
    "invitation-management"
    "password-reset"
    "process-submission"
    "search-lessons"
    "send-email"
    "smart-search"
    "user-management"
)

# Deploy each function
for func in "${FUNCTIONS[@]}"; do
    echo "📦 Deploying $func..."
    supabase functions deploy "$func" --no-verify-jwt
done

echo ""
echo "✅ All ${#FUNCTIONS[@]} functions deployed successfully!"
echo ""
echo "⚠️  Important: Make sure to set the following environment variables in Supabase Dashboard:"
echo "   - RESEND_API_KEY (for email sending)"
echo "   - OPENAI_API_KEY (for embeddings)"
echo "   - GOOGLE_SERVICE_ACCOUNT_JSON (for Google Docs extraction)"
echo ""
echo "📝 To set environment variables:"
echo "   1. Go to your Supabase Dashboard"
echo "   2. Navigate to Edge Functions"
echo "   3. Click on 'Manage Secrets'"
echo "   4. Add the required secrets"

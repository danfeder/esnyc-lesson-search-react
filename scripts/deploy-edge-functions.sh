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

# Discover deployable functions from the filesystem so this script can't drift
# from the workflow's filesystem-based discovery. Pure-bash glob so it works on
# macOS (bash 3.2) without depending on GNU find or `mapfile`.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONS_DIR="$SCRIPT_DIR/../supabase/functions"
if [ ! -d "$FUNCTIONS_DIR" ]; then
    echo "❌ Could not locate supabase/functions/ relative to this script."
    exit 1
fi

FUNCTIONS=()
# nullglob so an empty directory expands to nothing instead of leaving the
# literal `*/` pattern in the loop variable (which would add `*` to FUNCTIONS).
shopt -s nullglob
for dir in "$FUNCTIONS_DIR"/*/; do
    name="$(basename "$dir")"
    case "$name" in
        _*) ;;  # skip _shared and other underscore-prefixed support dirs
        *) FUNCTIONS+=("$name") ;;
    esac
done
shopt -u nullglob

if [ "${#FUNCTIONS[@]}" -eq 0 ]; then
    echo "❌ No edge functions discovered under $FUNCTIONS_DIR"
    exit 1
fi

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

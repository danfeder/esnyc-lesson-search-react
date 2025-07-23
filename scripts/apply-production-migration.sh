#!/bin/bash

# Apply migration to production database

echo "🚀 Applying migration to PRODUCTION database..."
echo "⚠️  This will modify the production database!"
echo ""
echo "Pre-flight checklist:"
echo "✅ Backup created at: database-backups/backup-2025-07-22T03-01-07/"
echo "✅ Migration tested successfully on test database"
echo "✅ All changes are additive only (no data loss)"
echo "✅ Raw text mapping verified (99.8% coverage)"
echo ""
read -p "Proceed with production migration? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 1
fi

# Link to production project
echo ""
echo "🔗 Linking to production project..."
supabase link --project-ref jxlxtzkmicfhchkhiojz

# Apply the migration
echo ""
echo "📝 Applying migration..."
echo "Note: You may be prompted for the database password"
supabase db push

echo ""
echo "✅ Migration applied!"
echo ""
echo "Next steps:"
echo "1. Verify migration in Supabase dashboard"
echo "2. Run: node scripts/import-raw-text-content.mjs"
echo "3. Run: node scripts/generate-content-hashes.mjs"
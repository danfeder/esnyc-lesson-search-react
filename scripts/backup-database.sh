#!/bin/bash
# Database backup script for safety before migrations

# Configuration
BACKUP_DIR="./database-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lessons-backup-$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔒 Creating database backup before migration..."
echo "   Backup will be saved to: $BACKUP_FILE"

# Export lessons data using Supabase CLI
# Note: You'll need to be logged in to Supabase first
echo "📦 Exporting database data..."

# Check if we're linked to a project
if ! supabase projects list > /dev/null 2>&1; then
    echo "❌ Not logged in to Supabase. Please run: supabase login"
    exit 1
fi

# First, let's try to get the database URL
echo "🔍 Getting database connection info..."
DB_URL=$(supabase db url --linked 2>/dev/null)

if [ -z "$DB_URL" ]; then
    echo "⚠️  Could not get database URL directly. Trying alternative backup method..."
    
    # Alternative: Use Supabase CLI with remote flag (doesn't require Docker)
    echo "📦 Creating backup using remote database..."
    
    # Export schema + data from remote database
    supabase db dump --linked \
      --schema public \
      --data-only \
      > "$BACKUP_FILE" 2>/dev/null
    
    BACKUP_STATUS=$?
else
    echo "✅ Got database URL, creating direct backup..."
    
    # Use pg_dump directly with the database URL
    PGPASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
    pg_dump "$DB_URL" \
      --data-only \
      --schema=public \
      --no-owner \
      --no-privileges \
      --no-comments \
      --if-exists \
      --clean \
      > "$BACKUP_FILE" 2>/dev/null
    
    BACKUP_STATUS=$?
fi

if [ $BACKUP_STATUS -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    echo "✅ Backup completed successfully!"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"
    
    # Create a restore script
    cat > "$BACKUP_DIR/restore-$TIMESTAMP.sh" << EOF
#!/bin/bash
# Restore script for backup from $TIMESTAMP
echo "⚠️  WARNING: This will restore data from $TIMESTAMP"
echo "   This may overwrite current data!"
read -p "Are you sure? (yes/no): " confirm

if [ "\$confirm" = "yes" ]; then
    # Get database URL
    DB_URL=\$(supabase db url --linked 2>/dev/null)
    
    if [ -z "\$DB_URL" ]; then
        echo "❌ Could not get database URL. Make sure you're linked to the project."
        exit 1
    fi
    
    psql "\$DB_URL" < "$BACKUP_FILE"
    echo "✅ Restore completed"
else
    echo "❌ Restore cancelled"
fi
EOF
    
    chmod +x "$BACKUP_DIR/restore-$TIMESTAMP.sh"
    echo "   Restore script: $BACKUP_DIR/restore-$TIMESTAMP.sh"
    
    # Also create a simple backup of just the lessons table
    echo ""
    echo "📋 Creating additional backup of lessons table..."
    LESSONS_BACKUP="$BACKUP_DIR/lessons-only-$TIMESTAMP.json"
    
    # Try to export lessons as JSON for extra safety
    supabase db dump --linked \
      --data-only \
      --schema public \
      --include-table lessons \
      > "$BACKUP_DIR/lessons-only-$TIMESTAMP.sql" 2>/dev/null
      
    if [ $? -eq 0 ]; then
        echo "✅ Additional lessons backup created: $BACKUP_DIR/lessons-only-$TIMESTAMP.sql"
    fi
else
    echo "❌ Backup failed! Do not proceed with migration."
    echo "   This might be because Docker is not running or pg_dump is not installed."
    echo ""
    echo "Alternative: You can create a manual backup by:"
    echo "1. Going to your Supabase dashboard"
    echo "2. Navigate to Database → Backups"
    echo "3. Create a manual backup"
    echo ""
    echo "Or install PostgreSQL client tools:"
    echo "   brew install postgresql"
    exit 1
fi
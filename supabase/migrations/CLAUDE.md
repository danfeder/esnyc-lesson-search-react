# Database Migrations

## Migration Guidelines

### Naming Convention
`[date]_[description].sql`
Example: `20250131_add_duplicate_detection.sql`

### Safety Rules
1. Always review generated SQL before running
2. Test migrations on a branch first
3. Include rollback commands in comments
4. Never drop columns without data backup

## Common Patterns

### Adding Columns
```sql
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS new_column TEXT;
```

### Creating Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_lessons_title 
ON lessons(title);
```

### RLS Policies
```sql
CREATE POLICY "Users can read own data" 
ON user_profiles FOR SELECT 
USING (auth.uid() = user_id);
```

## Current Schema Notes
- `lessons` table uses JSONB for flexible metadata
- Full-text search uses `to_tsvector` on content
- Vector embeddings in `embedding` column (future use)
- All tables have RLS policies enabled

## Testing Migrations
```bash
# Reset to clean state
supabase db reset

# Apply single migration
supabase db push
```

## Rollback Template
Always include rollback commands as comments:
```sql
-- Rollback: DROP INDEX IF EXISTS idx_name;
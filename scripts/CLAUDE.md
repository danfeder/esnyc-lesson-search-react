# Data Management Scripts

## ⚠️ CRITICAL RULES

1. **Service Role Key** - NEVER use in frontend, scripts only
2. **Batch Operations** - Process in batches of 50 to avoid timeouts
3. **Data Validation** - ALWAYS validate filter categories (see filterDefinitions.ts)
4. **Error Handling** - Scripts MUST exit(1) on errors
5. **Backup First** - ALWAYS backup before bulk operations

## 🚀 Quick Script Commands

```bash
# Data Import/Export
npm run import-data           # Import lessons from JSON
# (Legacy removed) Algolia sync and synonyms configuration are no longer used

# Testing
npm run test:rls              # Test RLS policies
npm run test:edge-functions   # Test edge functions

# Maintenance
node scripts/generate-embeddings.mjs     # Generate OpenAI embeddings
node scripts/analyze-duplicates.mjs      # Find duplicate lessons
node scripts/backup-remote-data.mjs      # Backup production data
```

## 🔧 Script Creation Pattern

```javascript
#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Validate environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Main function
async function main() {
  try {
    console.log('🔄 Starting script...');
    
    // Your logic here
    
    console.log('✅ Script completed successfully');
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run script
main();
```

## 🐛 Common Script Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Missing environment variables" | Check `.env` file exists and has required keys |
| "RLS policy violation" | Use service role key, not anon key |
| "Timeout during import" | Reduce batch size from 50 to 25 |
| "Module not found" | Use `.mjs` extension for ES modules |
| "Cannot use import" | Add `"type": "module"` to package.json |

## 📊 Data Import Patterns

### Batch Import with Progress
```javascript
const BATCH_SIZE = 50;
const items = JSON.parse(fs.readFileSync('data.json', 'utf8'));

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  
  console.log(`📥 Importing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(items.length/BATCH_SIZE)}...`);
  
  const { error } = await supabase
    .from('lessons')
    .upsert(batch, { onConflict: 'lesson_id' });
  
  if (error) {
    console.error('❌ Batch failed:', error);
    throw error;
  }
  
  console.log(`✅ Imported ${i + batch.length}/${items.length}`);
}
```

### Data Validation
```javascript
function validateLesson(lesson) {
  const errors = [];
  
  // Check required fields
  if (!lesson.lesson_id) errors.push('Missing lesson_id');
  if (!lesson.title) errors.push('Missing title');
  
  // Validate filter categories exist
  const filterCount = Object.keys(lesson.metadata || {}).length;
  if (filterCount === 0) {
    errors.push('No filter metadata found');
  }
  
  // Validate grade levels
  if (lesson.grade_levels) {
    const validGrades = ['3K', 'PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8'];
    const invalid = lesson.grade_levels.filter(g => !validGrades.includes(g));
    if (invalid.length) {
      errors.push(`Invalid grades: ${invalid.join(', ')}`);
    }
  }
  
  return errors;
}
```

## 🔍 Search Migration Notes

- Project now uses PostgreSQL full-text search for results and suggestions.
- Synonym and typo expansion handled via SQL functions and/or Edge Functions.
- Previous Algolia sync and config scripts have been removed.

## 🧪 Testing Scripts

### RLS Policy Test
```javascript
// Test as anonymous user
const anonClient = createClient(
  supabaseUrl,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { data, error } = await anonClient
  .from('lessons')
  .select('*')
  .limit(1);

if (error) {
  console.error('❌ Anonymous access failed:', error);
} else {
  console.log('✅ Anonymous can read lessons');
}
```

### Edge Function Test
```javascript
const response = await fetch(
  `${supabaseUrl}/functions/v1/detect-duplicates`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      submissionId: 'test-123',
      content: 'Test content',
      title: 'Test Title'
    })
  }
);

const result = await response.json();
console.log('Edge function response:', result);
```

## ⚠️ Script-Specific Notes

### import-data.js
- Filters out lessons without `lesson_id` or `file_link`
- Imports in batches of 50
- Uses upsert to handle duplicates

### sync-algolia.js
- Requires `ALGOLIA_ADMIN_API_KEY` (not search key)
- Transforms snake_case to camelCase
- Configures facets for filtering

### test-rls-policies.mjs
- Tests all tables for RLS enablement
- Checks policy counts
- Tests specific scenarios

### generate-embeddings.mjs
- Currently disabled (no OPENAI_API_KEY)
- Will generate vector embeddings for semantic search
- Processes in batches to avoid rate limits

## 📦 Environment Variables Reference

```bash
# Required for all scripts
VITE_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx  # Admin access

# Optional based on script
VITE_SUPABASE_ANON_KEY=xxx     # For testing
ALGOLIA_ADMIN_API_KEY=xxx      # For search sync
OPENAI_API_KEY=xxx              # For embeddings (future)
```

## 🚦 Pre-Script Checklist

- [ ] Environment variables set
- [ ] Database backed up
- [ ] Test on staging first
- [ ] Batch size appropriate
- [ ] Error handling in place
- [ ] Progress logging added
- [ ] Validation functions written

# Data Management Scripts

Scripts for data import, sync, and maintenance tasks.

## Environment Setup
All scripts require `.env` file with:
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (admin access)
- `ALGOLIA_ADMIN_API_KEY` (for search sync)

## Common Commands

### Import Lesson Data
```bash
npm run import-data
# Imports from data/lessons-combined-cleaned-final.json
```

### Sync to Algolia
```bash
npm run sync-algolia
# Updates Algolia search index
```

### Configure Search Synonyms
```bash
npm run configure-synonyms
# Sets up ingredient groupings and cultural hierarchies
```

## Script Patterns

### Supabase Admin Client
```javascript
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

### Error Handling
```javascript
const { data, error } = await supabase.from('table').select();
if (error) {
  console.error('Error:', error);
  process.exit(1);
}
```

## Data Processing Notes
- Clean ingredient lists before import
- Normalize grade levels (e.g., "3rd" → "3")
- Parse duration strings to minutes
- Validate all 11 filter categories

## Creating New Scripts
1. Add to `scripts/` directory
2. Use `.env` for configuration
3. Add npm script to package.json
4. Document expected data format
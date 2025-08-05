# Archive Policy

## Overview

This document defines the archival strategy for the ESYNYC Lesson Search v2 project. It ensures consistent handling of deprecated code, data, and documentation across the codebase.

## Archive Locations

All archived content is organized in designated directories:

| Directory | Purpose | Documentation |
|-----------|---------|---------------|
| `/archive/` | General archives (data, docs) | `/archive/README.md` |
| `/scripts/archive/` | Deprecated scripts | `/scripts/archive/README.md` |
| `/supabase/migrations/archive/` | Applied database migrations | `/supabase/migrations/archive/MANIFEST.md` |

## What to Archive vs Delete

### Archive These Items

✅ **Always Archive:**
- Original data files used for imports
- Database migrations that have been applied
- Scripts that solved specific problems (for reference)
- Documentation of deprecated features
- Configuration files from major version changes

✅ **Consider Archiving:**
- Test data that demonstrates edge cases
- Performance benchmarks from different versions
- Design documents and decisions
- Failed experiment code that provides learning value

### Delete These Items

❌ **Always Delete:**
- Files containing passwords or API keys
- Personal data beyond retention requirements
- Generated files that can be recreated
- Temporary debugging output
- Node modules or vendor directories
- Build artifacts

❌ **Consider Deleting:**
- Duplicate files with no unique value
- Commented-out code in active files
- Test files for deleted features
- Documentation for features that never shipped

## Archive Process

### 1. Pre-Archive Checklist
- [ ] Remove any sensitive data (credentials, PII)
- [ ] Document the file's original purpose
- [ ] Note why it's being archived
- [ ] Verify file isn't imported/required anywhere
- [ ] Check for dependent files that should also be archived

### 2. Archive Steps

```bash
# 1. Create archive location if needed
mkdir -p [archive-directory]

# 2. Move file with git
git mv [original-path] [archive-path]

# 3. Create/update README in archive directory
echo "## [filename]
- Archived: $(date +%Y-%m-%d)
- Original location: [original-path]
- Reason: [reason]
- Dependencies: [list any]
" >> [archive-directory]/README.md

# 4. Commit with clear message
git commit -m "archive: Move [file] to archive - [reason]"
```

### 3. Post-Archive Verification
- [ ] Application still builds successfully
- [ ] Tests pass
- [ ] No broken imports
- [ ] Documentation updated

## Retention Schedule

| Content Type | Retention Period | Review Cycle | Action After Period |
|--------------|-----------------|--------------|-------------------|
| Import data | 1 year | Quarterly | Delete if re-importable |
| Migrations | Indefinite | Annually | Keep for audit trail |
| Debug scripts | 6 months | Quarterly | Delete |
| Feature code | 1 year | Semi-annually | Delete or document |
| Documentation | 2 years | Annually | Consolidate or delete |
| Test data | 6 months | Quarterly | Delete |

## Security Considerations

### Before Archiving
1. Scan for hardcoded credentials
2. Remove API keys and tokens
3. Sanitize any user data
4. Check for internal URLs or endpoints

### Archived File Security
- Never commit credentials, even in archives
- Review archives during security audits
- Document if file contained sensitive data (without the data itself)
- Apply same security standards as active code

## Restoration Guidelines

### When to Restore
- Regression requires old implementation reference
- Rollback needed for critical issue
- Historical data needed for audit
- Feature being re-implemented

### How to Restore

1. **Review Archive Documentation**
   ```bash
   cat [archive-directory]/README.md
   ```

2. **Check Compatibility**
   - Compare with current dependencies
   - Review API/schema changes since archival
   - Check for security updates needed

3. **Test Before Restoring**
   ```bash
   # Create feature branch
   git checkout -b restore/[feature-name]
   
   # Copy file for testing (don't move yet)
   cp [archive-path] [temp-location]
   
   # Test thoroughly
   npm test
   ```

4. **Document Restoration**
   ```bash
   git mv [archive-path] [new-path]
   git commit -m "restore: Bring back [feature] from archive - [reason]"
   ```

## Archive Maintenance

### Quarterly Reviews
- Check 6-month retention items
- Verify archive documentation is current
- Remove items past retention period
- Update this policy if needed

### Annual Audit
- Review all indefinite retention items
- Consolidate similar archives
- Update archive structure if needed
- Security scan of archived files

### Responsible Parties
- **Development Team**: Archive code and scripts
- **Data Team**: Archive data files and migrations
- **Team Lead**: Approve deletions and policy changes
- **Security**: Annual security review of archives

## Archive Naming Conventions

### Files
```
original-name_ARCHIVED_YYYY-MM-DD.ext
```

### Directories
```
/archive/[category]/[original-name]/
```

### Migration Archives
```
YYYY-MM-DD_description.sql  # Keep original timestamp
```

## Examples

### Example 1: Archiving a Deprecated Script
```bash
# Original: /scripts/old-import.js
git mv scripts/old-import.js scripts/archive/old-import_ARCHIVED_2025-08-05.js

# Update scripts/archive/README.md
echo "## old-import.js
- Archived: 2025-08-05
- Original location: /scripts/old-import.js
- Reason: Replaced by import-data.js with better error handling
- Dependencies: fs, path, dotenv
" >> scripts/archive/README.md
```

### Example 2: Archiving Applied Migrations
```bash
# Move to archive (keeping timestamp)
git mv supabase/migrations/20250131_add_feature.sql \
       supabase/migrations/archive/20250131_add_feature.sql

# Update manifest
echo "- 20250131_add_feature.sql - Feature X implementation" \
     >> supabase/migrations/archive/MANIFEST.md
```

## Version History

- **v1.0** (2025-08-05): Initial archive policy
- **Next Review**: 2026-02-05

---

*This policy ensures consistent, secure, and well-documented archival practices across the project.*
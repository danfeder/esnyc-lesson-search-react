# Deployment Checklist

> **Note**: This is a comprehensive template. Customize it based on your actual deployment infrastructure and requirements. Not all steps may apply to your setup.

## Pre-Deployment Verification

### 🔍 Code Quality
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console.log statements in production code
- [ ] Error boundaries in place for critical components

### 📋 Database Preparation
- [ ] All migrations applied to target environment
- [ ] Database backed up before deployment
- [ ] RLS policies tested and verified
- [ ] Indexes optimized for production queries
- [ ] Connection pooling configured

### 🔐 Security Review
- [ ] Environment variables set correctly
- [ ] API keys are environment-specific
- [ ] CORS configured properly
- [ ] CSP headers configured
- [ ] Rate limiting enabled on edge functions
- [ ] Sensitive data not logged

### 📊 Monitoring Setup
- [ ] Sentry error tracking configured
- [ ] Performance monitoring enabled
- [ ] Database query monitoring active
- [ ] Uptime monitoring configured
- [ ] Alert thresholds set

## Deployment Steps

### 1️⃣ Pre-Deployment (30 minutes before)
```bash
# 1. Create deployment branch
git checkout -b deploy/v2.x.x

# 2. Update version
npm version patch/minor/major

# 3. Run final tests
npm test
npm run build

# 4. Check bundle size
npm run analyze

# 5. Create backup
npm run backup:production
```

### 2️⃣ Database Migration
```bash
# 1. Backup current database
supabase db dump > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Migrations reach the TEST project automatically: opening the PR applies them
#    and runs the RLS + E2E tests against the Netlify deploy preview (e2e.yml).
#    Verify on TEST with real data before merging (mcp__supabase-test__execute_sql).

# 3. Merging to main triggers migrate-production.yml: review the dry-run,
#    then approve the GitHub Environment gate. Never `supabase db push` by hand.

# 4. Verify migration status afterwards
supabase migration list
```

### 3️⃣ Edge Functions Deployment
```bash
# 1. Test functions locally
supabase functions serve

# 2. Deploy to the TEST project and smoke-test there (there is no staging environment)
supabase functions deploy --project-ref rxgajgmphciuaqzvwmox
npm run test:edge-functions

# 3. Deploy to production
supabase functions deploy --project-ref jxlxtzkmicfhchkhiojz

# 4. Verify functions
supabase functions list
```

### 4️⃣ Frontend Deployment

#### Netlify
```bash
# Automatic via GitHub integration
# Or manual:
netlify deploy --prod --dir=dist
```

#### Vercel
```bash
# Automatic via GitHub integration
# Or manual:
vercel --prod
```

#### Manual
```bash
# 1. Build production bundle
npm run build

# 2. Upload dist/ to hosting
scp -r dist/* user@server:/var/www/

# 3. Clear CDN cache if applicable
```

### 5️⃣ Post-Deployment Verification

#### Immediate Checks (First 5 minutes)
- [ ] Site loads without errors
- [ ] Authentication works
- [ ] Search returns results
- [ ] Filters apply correctly
- [ ] Admin dashboard accessible
- [ ] No console errors in browser
- [ ] No 404s in network tab

#### Functionality Tests (Next 15 minutes)
- [ ] Submit test lesson
- [ ] Review submission workflow
- [ ] Google Docs extraction
- [ ] Email notifications sending
- [ ] User registration flow
- [ ] Password reset flow

#### Performance Checks
- [ ] Page load time < 3 seconds
- [ ] Search response < 500ms
- [ ] Lighthouse score > 90
- [ ] No memory leaks detected
- [ ] Database query times normal

#### Monitoring Verification
- [ ] Sentry receiving events
- [ ] Analytics tracking pageviews
- [ ] Server logs accessible
- [ ] Backup job scheduled

## Rollback Procedures

### Quick Rollback (< 5 minutes)
```bash
# 1. Revert to previous deployment
netlify rollback  # or vercel rollback

# 2. Or redeploy previous version
git checkout v2.x.x-previous
npm run deploy:emergency
```

### Database Rollback
```bash
# 1. Stop application
npm run maintenance:on

# 2. Restore database backup
psql $DATABASE_URL < backup-timestamp.sql

# 3. Revert migrations if needed
supabase migration revert

# 4. Restart application
npm run maintenance:off
```

### Edge Function Rollback
```bash
# Deploy previous function version
supabase functions deploy --version previous
```

## Environment-Specific Checklists

### 🧪 TEST Project (pre-merge)
The pipeline is Local → TEST → PROD; there is no staging environment (see `supabase/migrations/CLAUDE.md`).
- [ ] PR open: CI applied migrations to TEST and the RLS + E2E jobs are green
- [ ] Netlify deploy preview checked by hand
- [ ] New functions / RLS policies verified on TEST with real data (`mcp__supabase-test__execute_sql`)

### 🚀 Production Deployment
- [ ] Maintenance mode page ready
- [ ] Backup completed
- [ ] Team notified via Slack/email
- [ ] Support team on standby
- [ ] Rollback plan confirmed
- [ ] Traffic gradually shifted (if using canary)

## Communication Plan

### Pre-Deployment
```markdown
**Scheduled Maintenance Notice**
Date: [DATE]
Time: [TIME] EST
Duration: ~30 minutes
Impact: Service may be briefly unavailable

We're deploying improvements to the lesson search platform.
```

### During Deployment
- Update status page
- Monitor #deployment Slack channel
- Keep stakeholders informed of progress

### Post-Deployment
```markdown
**Deployment Complete**
Version: v2.x.x
Status: ✅ Successful
Changes: [Brief summary]

All systems operational. Please report any issues.
```

## Deployment Schedule

### Regular Deployments
- **Tuesday/Thursday**: 10 AM EST
- **Never deploy**: Friday afternoon, before holidays

### Emergency Hotfixes
- Can deploy anytime with approval
- Requires two-person verification
- Must follow expedited checklist

## Post-Deployment Review

### Within 24 Hours
- [ ] Review error rates in Sentry
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Document any issues

### Within 1 Week
- [ ] Conduct deployment retrospective
- [ ] Update documentation
- [ ] Plan fixes for any issues
- [ ] Update this checklist if needed

## Useful Commands

```bash
# Check current version
git describe --tags

# View deployment history
git log --oneline --decorate --tags

# Check bundle size
npm run build -- --analyze

# Test production build locally
npm run build && npm run preview

# Check for vulnerabilities
npm audit

# Database connection test
supabase db test

# Edge function logs
supabase functions logs [function-name]
```

## Contact Information

### Deployment Team
- Lead: [Name] - [email/phone]
- Backup: [Name] - [email/phone]

### Emergency Contacts
- Supabase Support: support@supabase.io
- Hosting Support: [provider support]
- Domain/DNS: [registrar support]

## Deployment Log Template

```markdown
## Deployment Log - [DATE]

**Version**: v2.x.x
**Deployer**: [Name]
**Environment**: Production
**Start Time**: [TIME]
**End Time**: [TIME]

### Changes Deployed
- Feature: [description]
- Fix: [description]
- Update: [description]

### Issues Encountered
- [None | Description of issues]

### Rollback Required?
- [ ] No
- [ ] Yes - [reason]

### Notes
[Any additional observations]
```

---

*Last Updated: August 2025*
*Next Review: Before v3.0.0 deployment*
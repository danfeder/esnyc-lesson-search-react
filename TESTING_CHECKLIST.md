# Lesson Submission Pipeline - Quick Testing Checklist

## 🚀 Quick Start Testing

### Step 1: Start the App
```bash
npm run dev
```
Open http://localhost:5173

### Step 2: Test Edge Functions
```bash
node scripts/test-edge-functions.mjs
```
This will verify your Edge Functions are deployed and working.

### Step 3: Create Test Users

1. **Teacher Account**:
   - Go to http://localhost:5173
   - Click "Submit a Lesson" → Sign up
   - Email: `teacher@example.com`
   - Password: `TestPass123!`

2. **Reviewer Account**:
   - Sign up with: `reviewer@example.com` / `TestPass123!`
   - Go to Supabase Dashboard → SQL Editor
   - Run: `UPDATE user_profiles SET role = 'reviewer' WHERE email = 'reviewer@example.com';`

### Step 4: Test Core Workflows

#### ✅ Teacher Submission Flow
1. Login as teacher@example.com
2. Click "Submit a Lesson"
3. Enter a public Google Docs URL:
   - Example: `https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
4. Submit and check for:
   - ✓ Success message
   - ✓ Duplicate warnings (if any)

#### ✅ Reviewer Workflow
1. Login as reviewer@example.com
2. Go to http://localhost:5173/review
3. You should see submitted lessons
4. Click on a submission to review
5. Test the 11 filters:
   - [ ] Activity Type
   - [ ] Location
   - [ ] Grade Levels
   - [ ] Thematic Categories
   - [ ] Season & Timing
   - [ ] Core Competencies
   - [ ] Cultural Heritage
   - [ ] Lesson Format
   - [ ] Academic Integration
   - [ ] Social-Emotional Learning
   - [ ] Cooking Methods
6. Approve the lesson
7. Check database for new lesson

### Step 5: Verify in Database

Run in Supabase SQL Editor:

```sql
-- Check latest submissions
SELECT id, teacher_id, status, created_at 
FROM lesson_submissions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check latest lessons created
SELECT lesson_id, title, original_submission_id 
FROM lessons 
WHERE original_submission_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;
```

## 🐛 Common Issues

### "Connection Refused" on /submit or /review
- The app uses client-side routing
- Make sure you're accessing through the main app, not directly

### Edge Functions Not Working
- Check Supabase Dashboard → Functions
- Verify environment variables in Supabase settings
- Check function logs for errors

### Can't Access Review Dashboard
- Verify user role is set to 'reviewer' in database
- Clear browser cache/cookies
- Check console for auth errors

### Google Docs Extraction Fails
- Make sure doc is publicly accessible
- Or properly shared with service account
- Check Edge Function logs for specific errors

## 📊 What Success Looks Like

✅ **Submission Created**: Check `lesson_submissions` table
✅ **Duplicates Detected**: Check `submission_similarities` table  
✅ **Review Saved**: Check `submission_reviews` table
✅ **Lesson Created**: Check `lessons` table with `original_submission_id`
✅ **Version Archived**: Check `lesson_versions` table (for updates)

## 🎯 Next Steps

After basic testing works:
1. Test with more complex Google Docs
2. Test duplicate detection with similar content
3. Test the revision request workflow
4. Test with multiple reviewers
5. Performance test with many submissions
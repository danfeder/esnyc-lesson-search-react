# Lesson Submission Pipeline Testing Guide

## Overview
This guide covers comprehensive testing of the lesson submission pipeline, including authentication, submission, duplicate detection, and review workflows.

## Prerequisites

### 1. Environment Setup
```bash
# Start the development server
npm run dev

# Ensure Supabase is running and configured
# Check that all environment variables are set in .env
```

### 2. Test User Accounts
You'll need to create two types of users in Supabase:

#### Teacher Account
1. Sign up through the app at http://localhost:5173
2. Email: teacher@example.com
3. Password: TestPass123!
4. After signup, their user_profiles role will default to 'teacher'

#### Reviewer Account
1. Sign up through the app
2. Email: reviewer@example.com
3. Password: TestPass123!
4. Update their role in Supabase:
```sql
UPDATE user_profiles 
SET role = 'reviewer' 
WHERE email = 'reviewer@example.com';
```

### 3. Test Google Docs
Create a few Google Docs with lesson content for testing:

1. **New Lesson Doc**: https://docs.google.com/document/d/[YOUR_DOC_ID_1]
   - Make it publicly viewable or share with service account
   - Content example:
   ```
   Pizza Making Workshop
   
   Summary: Students will learn to make pizza from scratch, exploring fractions through measuring ingredients and understanding the science of yeast.
   
   Grade Levels: 3-5
   Duration: 90 minutes
   
   Materials:
   - Flour, yeast, salt
   - Tomato sauce, cheese
   - Measuring cups
   
   Procedure:
   1. Mix dry ingredients...
   ```

2. **Duplicate Lesson Doc**: Copy content from existing lesson (e.g., "Pizza Workshop Basics")
3. **Updated Lesson Doc**: Modified version of an existing lesson

## Testing Workflows

### 1. Authentication Flow Testing

#### Test 1.1: Teacher Signup
1. Navigate to http://localhost:5173
2. Click "Submit a Lesson" in header
3. Click "Sign up" in auth modal
4. Enter teacher credentials
5. Verify redirect to submission form

#### Test 1.2: Reviewer Login
1. Navigate to http://localhost:5173/review
2. Should redirect to home (not authenticated)
3. Login with reviewer credentials
4. Should see review dashboard

#### Test 1.3: Role-Based Access
1. Login as teacher
2. Try to access /review - should redirect to home
3. Login as reviewer
4. Access /review - should see dashboard

### 2. Submission Form Testing

#### Test 2.1: Valid Google Docs URL
1. Login as teacher
2. Navigate to /submit
3. Enter valid Google Docs URL
4. Submit form
5. Check console for:
   - Submission created
   - Edge Function called
   - Duplicate detection results

#### Test 2.2: Invalid URL Handling
1. Try submitting:
   - Non-Google Docs URL
   - Malformed URL
   - Empty URL
2. Verify appropriate error messages

#### Test 2.3: Duplicate Detection Warning
1. Submit a doc that's similar to existing lesson
2. Verify duplicate warning modal appears
3. Check similarity scores displayed
4. Test both "Continue as new" and "Update existing"

### 3. Review Dashboard Testing

#### Test 3.1: Dashboard Display
1. Login as reviewer
2. Navigate to /review
3. Verify:
   - Submissions listed
   - Status badges correct
   - Duplicate indicators shown
   - Filter tabs working

#### Test 3.2: Submission Filtering
1. Test each filter tab:
   - All
   - Submitted
   - Under Review
   - Approved
   - Rejected
   - Needs Revision
2. Verify counts update correctly

### 4. Review Detail Testing

#### Test 4.1: Load Submission Details
1. Click on a submission from dashboard
2. Verify displays:
   - Google Doc content
   - Teacher info
   - Submission date
   - Duplicate analysis

#### Test 4.2: All 11 Filters
Test each filter category:

1. **Activity Type** (single-select)
   - Select Cooking/Garden/Both/Academic
   
2. **Location** (single-select)
   - Select Indoor/Outdoor/Both
   
3. **Grade Levels** (multi-select)
   - Check multiple grades
   
4. **Thematic Categories** (multi-select)
   - Select from 7 themes
   
5. **Season & Timing** (single-select)
   - Select season or year-round
   
6. **Core Competencies** (multi-select)
   - Check multiple competencies
   
7. **Cultural Heritage** (hierarchical multi-select)
   - Test parent/child selections
   - Verify hierarchy works
   
8. **Lesson Format** (dropdown)
   - Select format type
   
9. **Academic Integration** (multi-select)
   - Check multiple subjects
   
10. **Social-Emotional Learning** (multi-select)
    - Check SEL skills
    
11. **Cooking Methods** (dropdown)
    - Select cooking method

#### Test 4.3: Review Decisions
1. **Approve as New**:
   - Tag with all filters
   - Add review notes
   - Click "Save Review"
   - Verify lesson created in database
   
2. **Approve as Update**:
   - Select duplicate to update
   - Tag with filters
   - Save review
   - Verify:
     - Original archived to lesson_versions
     - Lesson updated with new content
     - Version number incremented

3. **Request Revision**:
   - Add specific feedback
   - Save review
   - Verify status changes

4. **Reject**:
   - Add rejection reason
   - Save review
   - Verify status changes

### 5. End-to-End Workflows

#### Test 5.1: New Lesson Submission
1. Teacher submits new lesson
2. Reviewer reviews and approves
3. Verify lesson appears in main search
4. Check all metadata properly saved

#### Test 5.2: Duplicate Update Flow
1. Teacher submits updated version
2. System detects duplicate
3. Teacher chooses to update
4. Reviewer approves update
5. Verify:
   - Version archived
   - Main lesson updated
   - Version history available

#### Test 5.3: Revision Request Flow
1. Submit lesson
2. Reviewer requests revision
3. Teacher resubmits
4. Reviewer approves
5. Verify complete flow

## Database Verification Queries

Run these in Supabase SQL editor to verify data:

```sql
-- Check submissions
SELECT 
  ls.*,
  u.email as teacher_email,
  COUNT(ss.id) as similarity_count
FROM lesson_submissions ls
JOIN auth.users u ON ls.teacher_id = u.id
LEFT JOIN submission_similarities ss ON ls.id = ss.submission_id
GROUP BY ls.id, u.email
ORDER BY ls.created_at DESC;

-- Check reviews
SELECT 
  sr.*,
  ls.google_doc_url,
  u.email as reviewer_email
FROM submission_reviews sr
JOIN lesson_submissions ls ON sr.submission_id = ls.id
JOIN auth.users u ON sr.reviewer_id = u.id
ORDER BY sr.created_at DESC;

-- Check created lessons
SELECT 
  lesson_id,
  title,
  grade_levels,
  metadata,
  original_submission_id,
  version_number,
  created_at
FROM lessons
WHERE original_submission_id IS NOT NULL
ORDER BY created_at DESC;

-- Check lesson versions
SELECT * FROM lesson_versions
ORDER BY archived_at DESC;
```

## Common Issues & Troubleshooting

### 1. Google Docs Access Denied
- Ensure doc is publicly viewable or shared with service account
- Check service account email in Edge Function logs

### 2. Duplicate Detection Not Working
- Verify embeddings exist for all lessons
- Check Edge Function logs for errors
- Ensure OpenAI API key is set

### 3. Role-Based Access Issues
- Verify user_profiles.role is set correctly
- Check RLS policies are enabled
- Clear browser cache/cookies

### 4. Submission Not Processing
- Check Edge Function logs in Supabase dashboard
- Verify all environment variables set
- Check network tab for API errors

## Performance Testing

1. **Submission Processing Time**:
   - Should complete in < 5 seconds
   - Check Edge Function execution time

2. **Duplicate Detection Speed**:
   - Should return results in < 2 seconds
   - Monitor with large dataset

3. **Dashboard Load Time**:
   - Should load 50 submissions in < 1 second
   - Test with various filters

## Accessibility Testing

1. Keyboard navigation through all forms
2. Screen reader compatibility
3. Color contrast in status badges
4. Form validation messages

## Mobile Testing

1. Test submission form on mobile
2. Review dashboard responsive layout
3. Filter controls on small screens
4. Touch interactions for all buttons

## Security Testing

1. Try accessing review pages without auth
2. Try submitting without teacher role
3. Test SQL injection in form fields
4. Verify RLS policies working

## Next Steps

After completing all tests:
1. Document any bugs found
2. Create issues for improvements
3. Plan performance optimizations
4. Prepare for production deployment
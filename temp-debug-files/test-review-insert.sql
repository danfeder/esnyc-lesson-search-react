-- First, check the actual columns in submission_reviews
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'submission_reviews'
ORDER BY ordinal_position;

-- Test direct insert (replace the IDs with actual values)
-- You'll need to get a real submission_id and reviewer_id
/*
INSERT INTO submission_reviews (
  submission_id,
  reviewer_id,
  decision,
  notes,
  metadata
) VALUES (
  '7559d5dc-0429-460b-8268-ecee153223c1', -- Replace with actual submission ID
  'YOUR_REVIEWER_USER_ID', -- Replace with your reviewer's auth.users ID
  'approve_new',
  'Test review notes',
  '{}'::jsonb
);
*/
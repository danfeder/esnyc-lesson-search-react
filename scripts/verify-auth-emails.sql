-- Check if emails exist in auth.users for these users
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.full_name,
  p.role
FROM auth.users u
JOIN user_profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- Also test the RPC function with all user IDs
SELECT * FROM get_user_emails(
  ARRAY[
    '94ec6e13-8a9c-4ead-ae5c-3ea1266ae0e3'::uuid,
    '1a297e3c-a906-4340-a0d2-a8b26728b6d5'::uuid,
    '957e2ca9-a366-42eb-aef0-e5b79f74babe'::uuid,
    '2b49cb8d-2ddb-4e8c-ae48-f7fb2cb7df5e'::uuid,
    '78cbe55c-71bd-40ec-87d2-13cbb987e165'::uuid
  ]
);
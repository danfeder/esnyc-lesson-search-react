-- Fix "basic-prep" to only be used when it's the ONLY cooking method
-- If a lesson uses stovetop or oven, it shouldn't also have basic-prep

-- Remove basic-prep from any lessons that also have stovetop or oven
UPDATE lessons
SET cooking_methods = array_remove(cooking_methods, 'basic-prep')
WHERE cooking_methods IS NOT NULL
  AND 'basic-prep' = ANY(cooking_methods)
  AND (
    'stovetop' = ANY(cooking_methods) 
    OR 'oven' = ANY(cooking_methods)
  );

-- Verify the results
DO $$
DECLARE
  basic_prep_only_count INTEGER;
  basic_prep_with_cooking_count INTEGER;
  stovetop_count INTEGER;
  oven_count INTEGER;
  both_cooking_count INTEGER;
  empty_arrays_count INTEGER;
BEGIN
  -- Count lessons with ONLY basic-prep
  SELECT COUNT(*) INTO basic_prep_only_count
  FROM lessons
  WHERE cooking_methods = ARRAY['basic-prep']::TEXT[];
  
  -- Check if any still have basic-prep combined with cooking methods (should be 0)
  SELECT COUNT(*) INTO basic_prep_with_cooking_count
  FROM lessons
  WHERE 'basic-prep' = ANY(cooking_methods)
    AND ('stovetop' = ANY(cooking_methods) OR 'oven' = ANY(cooking_methods));
  
  -- Count lessons with stovetop
  SELECT COUNT(*) INTO stovetop_count
  FROM lessons
  WHERE 'stovetop' = ANY(cooking_methods);
  
  -- Count lessons with oven
  SELECT COUNT(*) INTO oven_count  
  FROM lessons
  WHERE 'oven' = ANY(cooking_methods);
  
  -- Count lessons with both stovetop and oven
  SELECT COUNT(*) INTO both_cooking_count
  FROM lessons
  WHERE 'stovetop' = ANY(cooking_methods)
    AND 'oven' = ANY(cooking_methods);
    
  -- Check for empty arrays
  SELECT COUNT(*) INTO empty_arrays_count
  FROM lessons
  WHERE cooking_methods IS NOT NULL 
    AND array_length(cooking_methods, 1) = 0;
  
  RAISE NOTICE 'Migration results:';
  RAISE NOTICE '  Lessons with ONLY basic-prep: %', basic_prep_only_count;
  RAISE NOTICE '  Lessons with basic-prep + cooking (should be 0): %', basic_prep_with_cooking_count;
  RAISE NOTICE '  Lessons with stovetop: %', stovetop_count;
  RAISE NOTICE '  Lessons with oven: %', oven_count;
  RAISE NOTICE '  Lessons with both stovetop AND oven: %', both_cooking_count;
  RAISE NOTICE '  Empty cooking_methods arrays: %', empty_arrays_count;
  
  IF basic_prep_with_cooking_count > 0 THEN
    RAISE WARNING 'Still have basic-prep combined with cooking methods!';
  END IF;
END $$;
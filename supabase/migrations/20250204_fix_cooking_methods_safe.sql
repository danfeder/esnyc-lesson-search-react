-- Fix cooking methods to use consistent lowercase values and consolidate variations
-- This version is safe and won't null out metadata

-- Step 1: Standardize all cooking methods in the array column
UPDATE lessons
SET cooking_methods = (
  SELECT array_agg(DISTINCT 
    CASE 
      -- Consolidate No-cook variations into basic-prep
      WHEN LOWER(method) = 'no-cook' THEN 'basic-prep'
      WHEN LOWER(method) = 'no cook' THEN 'basic-prep'
      
      -- Standardize Basic prep variations
      WHEN LOWER(method) = 'basic prep only' THEN 'basic-prep'
      WHEN LOWER(method) = 'basic prep' THEN 'basic-prep'
      WHEN LOWER(method) = 'basic-prep' THEN 'basic-prep'
      
      -- Standardize Stovetop variations
      WHEN LOWER(method) LIKE '%stovetop%' THEN 'stovetop'
      WHEN LOWER(method) = 'sautéing' THEN 'stovetop'
      WHEN LOWER(method) = 'steam' THEN 'stovetop'
      
      -- Standardize Oven
      WHEN LOWER(method) = 'oven' THEN 'oven'
      
      -- Default: lowercase the method
      ELSE LOWER(method)
    END
  )
  FROM unnest(cooking_methods) AS method
  WHERE method IS NOT NULL
)
WHERE cooking_methods IS NOT NULL AND array_length(cooking_methods, 1) > 0;

-- Step 2: Skip metadata update for now - it's complex and risky
-- The cooking_methods column is what matters for the application

-- Step 3: Verify the results
DO $$
DECLARE
  no_cook_count INTEGER;
  basic_prep_count INTEGER;
  stovetop_count INTEGER;
  oven_count INTEGER;
  other_methods TEXT[];
  null_metadata_count INTEGER;
BEGIN
  -- Check for any remaining No-cook variations
  SELECT COUNT(*) INTO no_cook_count
  FROM lessons
  WHERE EXISTS (
    SELECT 1 FROM unnest(cooking_methods) AS method 
    WHERE LOWER(method) LIKE '%no%cook%'
  );
  
  -- Count standardized values
  SELECT COUNT(*) INTO basic_prep_count
  FROM lessons
  WHERE 'basic-prep' = ANY(cooking_methods);
  
  SELECT COUNT(*) INTO stovetop_count
  FROM lessons
  WHERE 'stovetop' = ANY(cooking_methods);
  
  SELECT COUNT(*) INTO oven_count
  FROM lessons
  WHERE 'oven' = ANY(cooking_methods);
  
  -- Check for null metadata
  SELECT COUNT(*) INTO null_metadata_count
  FROM lessons
  WHERE metadata IS NULL;
  
  -- Find any non-standard values that remain
  SELECT array_agg(DISTINCT method) INTO other_methods
  FROM (
    SELECT unnest(cooking_methods) as method
    FROM lessons
    WHERE cooking_methods IS NOT NULL
  ) t
  WHERE method NOT IN ('basic-prep', 'stovetop', 'oven');
  
  RAISE NOTICE 'Migration results:';
  RAISE NOTICE '  Remaining no-cook: %', no_cook_count;
  RAISE NOTICE '  Basic-prep: %', basic_prep_count;
  RAISE NOTICE '  Stovetop: %', stovetop_count;
  RAISE NOTICE '  Oven: %', oven_count;
  RAISE NOTICE '  NULL metadata count: %', null_metadata_count;
  
  IF array_length(other_methods, 1) > 0 THEN
    RAISE NOTICE '  Other methods found: %', other_methods;
  END IF;
  
  IF no_cook_count > 0 THEN
    RAISE WARNING 'Still have no-cook variations!';
  END IF;
  
  IF null_metadata_count > 0 THEN
    RAISE EXCEPTION 'Migration would create NULL metadata!';
  END IF;
END $$;
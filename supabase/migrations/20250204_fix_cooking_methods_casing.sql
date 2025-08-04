-- Fix cooking methods to use consistent lowercase values and consolidate variations
-- This handles the actual data which has different casing and formats

-- Step 1: Standardize all cooking methods to lowercase and consistent format
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

-- Step 2: Also update metadata to reflect standardized values
UPDATE lessons
SET metadata = 
  CASE
    WHEN metadata->'cookingMethods' IS NOT NULL AND jsonb_typeof(metadata->'cookingMethods') = 'array' THEN
      jsonb_set(
        metadata, 
        '{cookingMethods}',
        (
          SELECT jsonb_agg(DISTINCT
            CASE 
              -- Consolidate No-cook variations
              WHEN LOWER(elem::text)::text = '"no-cook"' THEN 'basic-prep'
              WHEN LOWER(elem::text)::text = '"no cook"' THEN 'basic-prep'
              
              -- Standardize Basic prep variations  
              WHEN LOWER(elem::text)::text = '"basic prep only"' THEN 'basic-prep'
              WHEN LOWER(elem::text)::text = '"basic prep"' THEN 'basic-prep'
              WHEN LOWER(elem::text)::text = '"basic-prep"' THEN 'basic-prep'
              
              -- Standardize Stovetop variations
              WHEN LOWER(elem::text) LIKE '%stovetop%' THEN 'stovetop'
              WHEN LOWER(elem::text)::text = '"sautéing"' THEN 'stovetop'
              WHEN LOWER(elem::text)::text = '"steam"' THEN 'stovetop'
              
              -- Standardize Oven
              WHEN LOWER(elem::text)::text = '"oven"' THEN 'oven'
              
              -- Remove quotes and lowercase
              ELSE LOWER(trim(both '"' from elem::text))
            END
          )
          FROM jsonb_array_elements(metadata->'cookingMethods') AS elem
        )
      )
    ELSE metadata
  END
WHERE metadata IS NOT NULL AND metadata->'cookingMethods' IS NOT NULL;

-- Step 3: Verify the results
DO $$
DECLARE
  no_cook_count INTEGER;
  basic_prep_count INTEGER;
  stovetop_count INTEGER;
  oven_count INTEGER;
  other_methods TEXT[];
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
  
  IF array_length(other_methods, 1) > 0 THEN
    RAISE NOTICE '  Other methods found: %', other_methods;
  END IF;
  
  IF no_cook_count > 0 THEN
    RAISE WARNING 'Still have no-cook variations!';
  END IF;
END $$;
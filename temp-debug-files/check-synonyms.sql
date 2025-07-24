-- Check synonym counts by type
SELECT 
    synonym_type,
    COUNT(*) as count
FROM search_synonyms
GROUP BY synonym_type
ORDER BY synonym_type;

-- Check the structure of the table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'search_synonyms';

-- Sample some synonyms to verify they loaded correctly
SELECT * FROM search_synonyms LIMIT 10;

-- Count total synonym mappings (each term can have multiple synonyms in the array)
SELECT 
    COUNT(*) as total_terms,
    SUM(array_length(synonyms, 1)) as total_synonym_mappings
FROM search_synonyms;
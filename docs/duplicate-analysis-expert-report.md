# **Comprehensive Report: ESYNYC Lesson Database Duplicate Analysis**
## **Prepared for Expert Review**

---

## **1. PROJECT OVERVIEW**

### **What is ESYNYC Lesson Search?**

The Edible Schoolyard NYC (ESYNYC) Lesson Search v2 is a modern web application designed to help educators find and use garden-to-table lesson plans. The system contains **832 lesson plans** that have been collected over many years from various teachers and programs affiliated with Edible Schoolyard NYC.

### **The Core Mission**
- Provide teachers with high-quality, searchable lesson plans for garden and cooking education
- Support grades from 3K through 8th grade
- Integrate food education with academic subjects, social-emotional learning, and cultural heritage
- Make lesson discovery efficient through advanced search and filtering

### **Technical Architecture**
- **Frontend**: React 19 with TypeScript
- **Backend**: Supabase (PostgreSQL database)
- **Search**: Algolia for primary search, PostgreSQL full-text as fallback
- **State Management**: Zustand
- **Authentication**: Supabase Auth with role-based access control

---

## **2. THE DUPLICATE PROBLEM: UNDERSTANDING THE COMPLEXITY**

### **2.1 Why Do Duplicates Exist?**

The 832 lessons in the database come from multiple sources and time periods:

1. **Historical Accumulation**: Lessons collected over ~10 years from different teachers
2. **Multiple Versions**: Teachers often iterate on lessons, creating new versions
3. **Seasonal Variations**: Same core lesson adapted for different seasons
4. **Grade Adaptations**: Same concept taught differently for different grade levels
5. **Format Migrations**: Lessons migrated from various formats (Google Docs, PDFs, Word docs)
6. **Naming Inconsistencies**: Same lesson might be titled differently by different teachers
7. **Submission Pipeline**: New teacher submissions that might duplicate existing content

### **2.2 Current State of Duplicates**

Based on our analysis:
- **832 total lessons** in the database
- **697 unique titles** (135 lessons share titles with at least one other)
- **800 unique content hashes** (32 lessons have identical content to another)
- **~87.7% average metadata completeness** across all lessons

### **2.3 Examples of Duplicate Patterns**

#### **Pattern 1: Exact Title Duplicates**
- **"Three Sisters Tacos"**: 6 lessons with this exact title
  - All teach about Native American companion planting
  - Variations in grade levels, cooking methods, cultural focus
  
#### **Pattern 2: Seasonal Variations**
- **"The Seasons: Fall"**: 4 lessons
  - Two have identical content (same content_hash)
  - Two have different approaches (observation vs. identification focus)
  - Created across different years (2015-2021)

#### **Pattern 3: Near Duplicates with Variations**
- **"Borscht"**: 5 lessons
  - Same dish, different cultural angles (Eastern Europe, Jewish heritage, Ukrainian)
  - Different grade levels and cooking complexities

#### **Pattern 4: Conceptual Duplicates**
- **"All About Compost"**: 4 lessons
- **"Compost"**: Several more lessons
- **"Composting Basics"**: Additional variations
  - Same core concept, different approaches and grade levels

---

## **3. WHAT ACTUALLY CONSTITUTES A DUPLICATE?**

### **3.1 Definitional Challenges**

A "duplicate" in this context is not straightforward because:

1. **Educational Value of Variations**: Different approaches to the same topic serve different teaching styles
2. **Grade-Level Appropriateness**: "Three Sisters" for Kindergarten vs. 5th grade are functionally different
3. **Seasonal Context**: "Planting" in Spring vs. Fall requires different content
4. **Cultural Perspectives**: "Tamales" taught from Mexican vs. Central American perspectives

### **3.2 Our Working Definition of Duplicate Types**

#### **Type 1: Exact Duplicates**
- **Definition**: Identical content (same SHA256 hash)
- **Action Needed**: Keep one, archive others
- **Example**: Two "The Seasons: Fall" lessons with hash `ccf062aa68089b2a723acd0c069c1fdd638beb4abcabd37ec1d98474617d718c`

#### **Type 2: Near Duplicates**
- **Definition**: >85% similar content (via embedding cosine similarity)
- **Action Needed**: Manual review to potentially merge
- **Example**: Multiple "Three Sisters" lessons with slight variations

#### **Type 3: Title Variations**
- **Definition**: Similar titles (>80% string similarity) but different content
- **Action Needed**: Clarify titles to differentiate
- **Example**: "The Seasons: Fall" vs. "The Seasons: Spring" (related but distinct)

#### **Type 4: Conceptual Duplicates**
- **Definition**: Same educational concept, different implementations
- **Action Needed**: Tag and group for teacher choice
- **Example**: Various "Compost" lessons for different contexts

---

## **4. CURRENT DUPLICATE ANALYSIS APPROACH**

### **4.1 Technical Implementation**

Our current approach uses a multi-layered similarity detection system:

#### **Layer 1: Content Hashing**
```typescript
// Generate SHA256 hash of normalized content
const normalizedContent = content
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();
const hash = createHash('sha256').update(normalizedContent).digest('hex');
```
- **Purpose**: Detect exact content matches
- **Current State**: 800 unique hashes out of 832 lessons

#### **Layer 2: Semantic Similarity (Embeddings)**
```typescript
// OpenAI text-embedding-3-small model (1536 dimensions)
const embedding = await openai.createEmbedding({
  model: 'text-embedding-3-small',
  input: lessonContent
});

// Cosine similarity between embeddings
function cosineSimilarity(vec1, vec2) {
  // Returns value between 0 and 1
}
```
- **Purpose**: Find semantically similar content
- **Threshold**: 0.85 (85% similarity)
- **Current State**: All 832 lessons now have embeddings

#### **Layer 3: Title Similarity**
```typescript
// Levenshtein distance for string similarity
function calculateTextSimilarity(title1, title2) {
  // Returns normalized edit distance
}
```
- **Purpose**: Catch variations in naming
- **Threshold**: 0.8 (80% similarity)

### **4.2 Grouping Algorithm: Union-Find with Transitive Closure**

The key innovation in our approach is using a **Union-Find data structure** to create transitive groups:

```typescript
class UnionFind {
  // If A is similar to B, and B is similar to C
  // Then A, B, and C are all in the same group
  // Even if A and C aren't directly similar
}
```

**Why This Matters**:
- Lesson A: "Three Sisters Tacos with Corn Tortillas"
- Lesson B: "Three Sisters Tacos"  
- Lesson C: "Three Sisters Taco Recipe"

Even if A and C aren't directly similar enough, they both connect through B, so all three group together.

### **4.3 Canonical Selection Algorithm**

For each duplicate group, we automatically recommend which lesson should be the "canonical" (primary) version:

#### **Scoring Weights**:
1. **Quality Score (35%)**: Based on AI confidence scores from content analysis
2. **Completeness (20%)**: How many metadata fields are filled
3. **Recency (15%)**: Newer lessons score higher
4. **AI Quality (15%)**: Lesson plan structure and pedagogical quality
5. **Processing Notes (10%)**: Penalize if marked as duplicate
6. **Naming Quality (5%)**: Clean, professional titles score higher

#### **Scoring Example**:
```
Lesson: "Three Sisters Tacos" (2021 version)
- Quality: 0.92 × 0.35 = 0.322
- Completeness: 0.87 × 0.20 = 0.174  
- Recency: 0.75 × 0.15 = 0.113
- AI Quality: 0.95 × 0.15 = 0.143
- Notes: 1.0 × 0.10 = 0.100
- Naming: 1.0 × 0.05 = 0.050
Total Score: 0.902
```

### **4.4 Current Analysis Results**

Based on the most recent analysis (before adding the 55 missing lessons):
- **86 duplicate groups** identified
- **58 exact match groups** (identical content)
- **13 near duplicate groups** (>85% similar)
- **7 title variation groups** (similar titles, different content)
- **8 mixed groups** (combination of similarity types)
- **205 total lessons** involved in duplicates (~25% of database)

---

## **5. CHALLENGES AND EDGE CASES**

### **5.1 The "Seasons" Problem**

The Seasons lessons demonstrate the complexity:
- **"The Seasons: Fall"**: 4 versions
  - 2 are identical (different file IDs, same content)
  - 2 are pedagogically different approaches
  - All serve Kindergarten but with different teaching methods

**Question for Expert**: Should these be considered duplicates or valuable variations?

### **5.2 The Cultural Heritage Challenge**

Example: "Tamales" (4 versions)
- Mexican tradition focus
- Central American variations
- Vegetarian adaptations
- Different spice levels for age groups

**Question for Expert**: How do we preserve cultural nuance while reducing redundancy?

### **5.3 The Grade-Level Adaptation Issue**

Example: "Plant Life Cycle"
- Kindergarten: Acting out the cycle
- 2nd Grade: Drawing and labeling
- 5th Grade: Scientific vocabulary and processes

**Question for Expert**: Are these duplicates or essential grade-appropriate variations?

### **5.4 The Metadata Completeness Problem**

- **87.7% average completeness** seems good, but:
  - Only 45% have ingredients tagged (56% have cooking content)
  - Only 45% have cultural heritage (many lessons have cultural content)
  - Missing metadata makes similarity detection harder

### **5.5 The Source Authority Question**

- Lessons from official ESYNYC curriculum developers
- Teacher-submitted variations
- Community contributions
- No clear "authoritative" source marking

---

## **6. TECHNICAL DETAILS OF IMPLEMENTATION**

### **6.1 Data Structure**

Each lesson contains:
```typescript
{
  lesson_id: string;          // Unique identifier
  title: string;              // Display title
  summary: string;            // Brief description
  content_text: string;       // Full searchable text
  content_hash: string;       // SHA256 of normalized content
  content_embedding: vector;  // 1536-dim OpenAI embedding
  
  // Metadata arrays (the 11 sacred filters)
  grade_levels: string[];
  thematic_categories: string[];
  season_timing: string[];
  core_competencies: string[];
  cultural_heritage: string[];
  location_requirements: string[];
  activity_type: string[];
  lesson_format: string;      // Note: not an array
  main_ingredients: string[];
  cooking_methods: string[];
  academic_integration: string[];
  social_emotional_learning: string[];
  
  // Quality indicators
  confidence: {
    level: string;
    quality_markers: string;
    validation_status: string;
    lesson_plan_confidence: number;
  };
  processing_notes: string;
  
  // Timestamps
  created_at: timestamp;
  last_modified: timestamp;
}
```

### **6.2 The Analysis Pipeline**

1. **Data Extraction** (Complete ✓)
   - All 832 lessons have content_text
   - All have content_hash (SHA256)
   - All have embeddings (OpenAI text-embedding-3-small)

2. **Similarity Calculation** (O(n²) comparisons)
   - 345,696 total comparisons for 832 lessons
   - Three similarity metrics calculated per pair
   - Similarity matrix stored for all pairs above threshold

3. **Group Formation** (Union-Find Algorithm)
   - Transitive closure ensures complete groups
   - No overlapping groups possible
   - Groups typed by predominant similarity type

4. **Canonical Selection** (Weighted Scoring)
   - Each lesson scored independently
   - Highest score becomes recommended canonical
   - Scores and breakdown stored for transparency

5. **Report Generation** (JSON + Summary)
   - Detailed JSON with all relationships
   - Human-readable summary statistics
   - Per-group recommendations

---

## **7. QUESTIONS FOR THE EXPERT**

### **7.1 Philosophical Questions**

1. **What is the educational value of keeping similar lessons?**
   - Do teachers benefit from having multiple approaches to the same concept?
   - Is variation in teaching style worth the complexity?

2. **How should we handle cultural variations?**
   - Is "Borscht" with Ukrainian focus different enough from Russian focus?
   - Should we preserve all cultural perspectives even if recipes are similar?

3. **What about teacher authorship and attribution?**
   - Should original authors have preference in canonical selection?
   - How do we handle collaborative or evolved lessons?

### **7.2 Technical Questions**

1. **Similarity Thresholds**
   - Is 85% semantic similarity the right threshold for "near duplicate"?
   - Should title similarity be weighted differently?
   - Should we use different thresholds for different metadata categories?

2. **Grouping Logic**
   - Is transitive closure the right approach? (If A~B and B~C, then group A,B,C together)
   - Should we allow overlapping groups for different similarity types?
   - How do we handle lessons that are similar in title but different in content?

3. **Canonical Selection**
   - Are our scoring weights appropriate?
   - Should recency matter less for established curriculum?
   - How do we factor in teacher feedback or usage data?

### **7.3 Practical Questions**

1. **User Interface**
   - Should teachers see all variations or just canonical versions by default?
   - How do we present "related lessons" vs. "duplicate lessons"?
   - What level of detail should teachers see about why lessons are grouped?

2. **Maintenance**
   - How do we handle new submissions that might be duplicates?
   - Should the system auto-reject exact duplicates?
   - How often should we re-run duplicate analysis?

3. **Data Preservation**
   - Should we keep all versions in an archive?
   - How do we handle lessons that teachers specifically request to keep?
   - What about lessons currently in use in active curricula?

---

## **8. CURRENT TECHNICAL APPROACH DETAILS**

### **8.1 The Union-Find Algorithm Implementation**

```typescript
class UnionFind {
  private parent: Map<string, string>;
  private rank: Map<string, number>;

  makeSet(x: string) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  find(x: string): string {
    // Path compression for efficiency
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string) {
    // Union by rank for balanced trees
    const rootX = this.find(x);
    const rootY = this.find(y);
    
    if (rootX === rootY) return;
    
    // Attach smaller tree under root of larger tree
    if (this.rank.get(rootX)! < this.rank.get(rootY)!) {
      this.parent.set(rootX, rootY);
    } else if (this.rank.get(rootX)! > this.rank.get(rootY)!) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, this.rank.get(rootX)! + 1);
    }
  }
}
```

**Why Union-Find?**
- **Efficiency**: O(α(n)) per operation (nearly constant)
- **Transitive Property**: Automatically handles indirect relationships
- **No Overlaps**: Each lesson belongs to exactly one group
- **Scalable**: Handles large datasets efficiently

### **8.2 Similarity Calculation Details**

#### **Content Hash (Exact Matching)**
- Normalize: lowercase, single spaces, trim whitespace
- SHA256 hash for consistent comparison
- Binary result: match or no match

#### **Embedding Similarity (Semantic)**
```python
def cosine_similarity(vec1, vec2):
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    return dot_product / (norm1 * norm2)
```
- OpenAI text-embedding-3-small model
- 1536 dimensions
- Cosine similarity (0 to 1 scale)
- Threshold: 0.85 for "near duplicate"

#### **Title Similarity (String Matching)**
- Levenshtein distance (edit distance)
- Normalized by longer string length
- Threshold: 0.8 for "similar title"

### **8.3 Content Generation for Embeddings**

For lessons missing content_text, we generate it from metadata:
```typescript
function generateContentText(lesson): string {
  const parts = [];
  
  // Add all text fields
  if (lesson.title) parts.push(lesson.title);
  if (lesson.summary) parts.push(lesson.summary);
  
  // Add metadata as text
  if (lesson.grade_levels?.length > 0) {
    parts.push(`Grade Levels: ${lesson.grade_levels.join(', ')}`);
  }
  // ... continue for all metadata fields
  
  return parts.join('\n\n');
}
```

---

## **9. SPECIFIC EXAMPLES REQUIRING EXPERT INPUT**

### **Example 1: The Three Sisters Collection**

We have 6+ lessons about "Three Sisters" (corn, beans, squash):
1. **"Three Sisters Tacos"** (6 versions)
2. **"Three Sisters Stew"** (3 versions)
3. **"Three Sisters Garden"** (4 versions)
4. **"Three Sisters Enchiladas"** (1 version)
5. **"Three Sisters Soup"** (2 versions)

**Questions**:
- Should all "Three Sisters" lessons be grouped as related?
- Are recipe variations (tacos vs. stew) significant enough to keep separate?
- How do we balance cultural authenticity with practical redundancy?

### **Example 2: Seasonal Progression**

We have complete seasonal sets with variations:
- **"The Seasons: Spring"** (3 versions)
- **"The Seasons: Summer"** (2 versions)
- **"The Seasons: Fall"** (4 versions)
- **"The Seasons: Winter"** (3 versions)
- **"The Year in Seasons"** (1 version)

**Questions**:
- Should seasonal lessons be a "series" rather than duplicates?
- How do we handle when two "Fall" lessons are identical but two are different?
- Should the comprehensive "Year in Seasons" replace the individual season lessons?

### **Example 3: Cultural Food Traditions**

Multiple versions of culturally significant dishes:
- **"Borscht"** (5 versions - Ukrainian, Russian, Jewish perspectives)
- **"Tamales"** (4 versions - Mexican, Central American, vegetarian)
- **"Fattoush"** (4 versions - different Middle Eastern countries)

**Questions**:
- Is cultural perspective enough to justify keeping all versions?
- How do we respect cultural authenticity while reducing redundancy?
- Should we create "master lessons" with cultural variations as sub-sections?

---

## **10. RECOMMENDATIONS WE'RE CONSIDERING**

### **10.1 Tiered Approach to Duplicates**

**Tier 1: Exact Duplicates** (Same content_hash)
- **Action**: Automatically archive all but one
- **Selection**: Use scoring algorithm for canonical
- **Preservation**: Keep archived versions accessible

**Tier 2: Near Duplicates** (>85% embedding similarity)
- **Action**: Flag for manual review
- **Present**: Show side-by-side comparison
- **Option**: Merge content or maintain separation

**Tier 3: Conceptual Relations** (Similar topic, different approach)
- **Action**: Link as "related lessons"
- **Display**: Show as options to teachers
- **Metadata**: Tag with relationship type

### **10.2 Enhanced Metadata for Differentiation**

Add fields to better distinguish similar lessons:
- **Teaching Approach**: (hands-on, demonstration, discussion, etc.)
- **Difficulty Level**: (beginner, intermediate, advanced)
- **Time Required**: (30 min, 45 min, 60 min, etc.)
- **Cultural Focus**: (specific cultural perspective)
- **Season Specific**: (which specific months)
- **Prerequisite Lessons**: (what should be taught first)

### **10.3 User Interface Solutions**

**Primary Display**: Show only canonical versions
**Expansion Option**: "See 3 variations of this lesson"
**Comparison View**: Side-by-side feature comparison
**Teacher Choice**: Let teachers "favorite" their preferred version
**Usage Tracking**: Learn which variations are actually used

---

## **11. IMPACT ANALYSIS**

### **11.1 Current Impact of Duplicates**

**For Teachers**:
- **Confusion**: "Which 'Three Sisters Tacos' should I use?"
- **Time Lost**: Reviewing multiple similar lessons
- **Missed Content**: Good lessons buried among duplicates
- **Inconsistent Experience**: Different teachers using different versions

**For System**:
- **Storage**: ~25% of database is duplicates
- **Search Quality**: Duplicate results clutter search
- **Maintenance**: More content to review and update
- **Synchronization**: Keeping related lessons aligned

### **11.2 Potential Benefits of Resolution**

**Improved Discovery**:
- Cleaner search results
- Better relevance ranking
- Easier browsing by topic
- Clear "best version" recommendations

**Enhanced Quality**:
- Merged "best of" content
- Consistent formatting
- Complete metadata
- Regular updates to canonical versions

**Teacher Empowerment**:
- Confidence in lesson selection
- Time saved in planning
- Access to variations when needed
- Clear differentiation between options

---

## **12. CONCLUSION AND REQUEST FOR EXPERT GUIDANCE**

### **Summary of Current State**

We have built a sophisticated duplicate detection system that:
1. Successfully identifies exact, near, and title-based duplicates
2. Uses modern NLP (embeddings) for semantic similarity
3. Implements graph algorithms (Union-Find) for transitive grouping
4. Provides algorithmic recommendations for canonical versions
5. Preserves all versions while identifying relationships

### **Key Decisions Needed**

1. **Philosophical**: What constitutes a valuable variation vs. redundant duplicate?
2. **Technical**: Are our similarity thresholds and grouping logic appropriate?
3. **Practical**: How should we present duplicate groups to teachers?
4. **Cultural**: How do we respect diverse perspectives while reducing redundancy?
5. **Pedagogical**: Should grade-level adaptations be treated as duplicates?

### **Specific Areas for Expert Input**

1. **Algorithm Review**: Is our Union-Find transitive closure approach optimal?
2. **Threshold Tuning**: Should we adjust our 85% semantic similarity threshold?
3. **Scoring Weights**: Are we weighing the right factors for canonical selection?
4. **Edge Cases**: How should we handle the seasonal, cultural, and grade-level variations?
5. **Future-Proofing**: How do we handle new submissions to prevent duplicate accumulation?

### **Next Steps After Expert Review**

Based on your guidance, we plan to:
1. Adjust similarity thresholds and scoring weights
2. Implement recommended grouping logic changes
3. Design user interface for duplicate management
4. Create policies for ongoing duplicate prevention
5. Build tools for teachers to provide feedback on groupings

---

**Thank you for reviewing this comprehensive analysis. We look forward to your expert insights on optimizing our duplicate detection and management strategy.**
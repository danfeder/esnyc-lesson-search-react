# Content Extraction Method Comparison

## Summary of Results

After fixing the JavaScript extraction issue and properly extracting content, here's the final status of the 53 problematic lessons:

- **38 lessons** (72%) - Fully extracted (>2000 chars, avg 3,938)
- **13 lessons** (24%) - Partially extracted (1000-2000 chars)
- **2 lessons** (4%) - Failed ("Unknown" title, 273 chars)

## Method Comparison

### 1. Edge Function (extract-google-doc)
**Success Rate:** ~20% (11 lessons)
**Quality:** Good when it works
**Issues:** 
- Returns "This operation is not supported" for many docs
- Might be hitting API limits or permission issues
- Works best with standard Google Docs

### 2. Public URL Export (?format=txt)
**Success Rate:** ~80% (Most reliable)
**Quality:** Excellent - full document content
**How it works:**
```javascript
const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
```
**Pros:**
- Direct access to document content
- No JavaScript parsing needed
- Preserves formatting well
**Cons:**
- Returns 400/401 for some docs (permissions/deleted)
- Doesn't work for PDFs in Drive

### 3. Google Docs Viewer (AVOID!)
**Success Rate:** 0% (Completely broken)
**Quality:** Terrible - returns JavaScript code
**Issues:**
- Extracts viewer page JavaScript, not document content
- Results in garbage like: `export _init([["0",null,null...`
- **DO NOT USE THIS METHOD**

### 4. HTML Export (?format=html)
**Success Rate:** ~60%
**Quality:** Good after HTML stripping
**Pros:**
- Alternative when TXT export fails
- Can preserve more formatting
**Cons:**
- Requires HTML parsing
- More complex extraction

## Recommended Extraction Strategy

```javascript
async function extractGoogleDoc(docId) {
  // 1. Try TXT export first (most reliable)
  try {
    const response = await fetch(
      `https://docs.google.com/document/d/${docId}/export?format=txt`
    );
    if (response.ok) {
      return await response.text();
    }
  } catch (err) {}
  
  // 2. Try HTML export as fallback
  try {
    const response = await fetch(
      `https://docs.google.com/document/d/${docId}/export?format=html`
    );
    if (response.ok) {
      const html = await response.text();
      // Strip HTML tags
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  } catch (err) {}
  
  // 3. Try edge function (if available)
  try {
    const result = await callEdgeFunction(docId);
    if (result.success) return result.content;
  } catch (err) {}
  
  // 4. Return null if all methods fail
  return null;
}
```

## Key Findings

1. **Direct export URLs are most reliable** - Use `export?format=txt` as primary method
2. **Never use viewer URLs** - They return JavaScript, not content
3. **Edge functions have limitations** - Good for API integration but not for bulk extraction
4. **Some docs are genuinely inaccessible** - Deleted, permission-restricted, or PDFs

## Content Quality After Proper Extraction

**Before:** 
- Average: 761 chars
- Many with only summaries

**After:**
- Average: 3,938 chars
- Full lesson plans with procedures, materials, objectives

## Example of Properly Extracted Content

**African American Food Traditions** (9,960 chars):
```
Grades 3-5
All Seasons
Indoor

African American Food Traditions

Summary: Students will make Hoppin' John burgers, then participate in a "museum tour" to see artifacts that tell about African American contributions to American food culture.

Objectives: Students will learn about ingredients, dishes, and cooking techniques that were innovated by African American farmers and cooks...

[Full lesson plan with materials, procedures, vocabulary, etc.]
```

## Conclusion

The **public URL export method** (`export?format=txt`) is the most foolproof and successful way to extract Google Docs content. The viewer method should be completely avoided as it extracts JavaScript code instead of document content.
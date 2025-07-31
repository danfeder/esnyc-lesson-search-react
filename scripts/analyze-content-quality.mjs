#!/usr/bin/env node

/**
 * Analyzes raw text content quality for lesson scoring
 */

// Key lesson components to look for
const LESSON_COMPONENTS = {
  objectives: {
    patterns: [/objectives?:/i, /learning goals?:/i, /students will:/i, /learners will:/i],
    weight: 0.15
  },
  materials: {
    patterns: [/materials?:/i, /ingredients?:/i, /supplies:/i, /you('ll)? need:/i],
    weight: 0.15
  },
  procedures: {
    patterns: [/procedures?:/i, /instructions?:/i, /steps?:/i, /directions?:/i, /method:/i],
    weight: 0.20
  },
  timeEstimate: {
    patterns: [/\d+\s*(minutes?|mins?|hours?|hrs?)/i, /duration:/i, /time:/i],
    weight: 0.05
  },
  assessment: {
    patterns: [/assessment:/i, /evaluation:/i, /reflection:/i, /discussion questions?:/i],
    weight: 0.10
  },
  vocabulary: {
    patterns: [/vocabulary:/i, /key terms?:/i, /words? to know:/i, /glossary:/i],
    weight: 0.10
  },
  extensions: {
    patterns: [/extensions?:/i, /variations?:/i, /adaptations?:/i, /differentiation:/i],
    weight: 0.10
  },
  safety: {
    patterns: [/safety:/i, /caution:/i, /be careful/i, /supervision/i],
    weight: 0.05
  },
  academicConnections: {
    patterns: [/academic connections?:/i, /curriculum links?:/i, /standards?:/i, /common core:/i],
    weight: 0.10
  }
};

/**
 * Analyzes the structural completeness of lesson content
 * @param {string} rawText - The raw text content of the lesson
 * @returns {object} - Score breakdown and total
 */
export function analyzeContentQuality(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { totalScore: 0, components: {}, contentLength: 0 };
  }

  const text = rawText.toLowerCase();
  const components = {};
  let totalScore = 0;

  // Check for each component
  for (const [component, config] of Object.entries(LESSON_COMPONENTS)) {
    const found = config.patterns.some(pattern => pattern.test(text));
    components[component] = found;
    if (found) {
      totalScore += config.weight;
    }
  }

  // Additional quality metrics
  const qualityMetrics = {
    // Has numbered steps (indicates clear procedures)
    hasNumberedSteps: /\d+\.\s+\w+/m.test(rawText),
    
    // Has bullet points (indicates organized content)
    hasBulletPoints: /[•·▪▫◦‣⁃]\s+\w+/m.test(rawText) || /^\s*[-*]\s+\w+/m.test(rawText),
    
    // Content length (normalized to 0-1 scale, with 5000 chars as "ideal")
    contentLengthScore: Math.min(rawText.length / 5000, 1),
    
    // Has clear sections (multiple headings)
    hasClearSections: (rawText.match(/^#+\s+.+$/gm) || []).length >= 3 ||
                      (rawText.match(/^[A-Z][A-Za-z\s]+:$/gm) || []).length >= 3,
    
    // Instructional language (action verbs)
    hasInstructionalLanguage: /\b(cut|mix|plant|measure|observe|discuss|write|draw|create|prepare|add|stir|water|harvest)\b/i.test(text)
  };

  // Add bonus points for quality indicators (up to 0.2 additional)
  let qualityBonus = 0;
  if (qualityMetrics.hasNumberedSteps) qualityBonus += 0.05;
  if (qualityMetrics.hasBulletPoints) qualityBonus += 0.05;
  if (qualityMetrics.hasClearSections) qualityBonus += 0.05;
  if (qualityMetrics.hasInstructionalLanguage) qualityBonus += 0.05;

  totalScore = Math.min(totalScore + qualityBonus, 1); // Cap at 1.0

  return {
    totalScore,
    components,
    qualityMetrics,
    contentLength: rawText.length,
    // Detailed breakdown for debugging
    breakdown: {
      componentScore: totalScore - qualityBonus,
      qualityBonus,
      missingComponents: Object.entries(components)
        .filter(([_, found]) => !found)
        .map(([name]) => name)
    }
  };
}

/**
 * Compares content quality between duplicate lessons
 * @param {string} content1 - First lesson's raw text
 * @param {string} content2 - Second lesson's raw text
 * @returns {object} - Comparison results
 */
export function compareContentQuality(content1, content2) {
  const analysis1 = analyzeContentQuality(content1);
  const analysis2 = analyzeContentQuality(content2);

  return {
    lesson1: analysis1,
    lesson2: analysis2,
    recommendation: analysis1.totalScore > analysis2.totalScore ? 1 : 2,
    scoreDifference: Math.abs(analysis1.totalScore - analysis2.totalScore),
    significantDifference: Math.abs(analysis1.totalScore - analysis2.totalScore) > 0.15
  };
}

// Example scoring weight integration
export function calculateEnhancedCanonicalScore(lesson, existingScore) {
  const contentAnalysis = analyzeContentQuality(lesson.raw_text || '');
  
  // New weight distribution
  const weights = {
    existingFactors: 0.60,  // Reduce from 1.0 to 0.6
    contentQuality: 0.40    // Add 40% weight for content
  };
  
  return (existingScore * weights.existingFactors) + 
         (contentAnalysis.totalScore * weights.contentQuality);
}
import DOMPurify from 'dompurify';

/**
 * Sanitize text content to prevent XSS attacks using DOMPurify.
 * This is a battle-tested library that handles edge cases properly.
 *
 * Note: For displaying user content, React already escapes HTML by default.
 * This provides an additional layer of defense for content from external sources
 * like Google Docs extractions.
 *
 * IMPORTANT: DOMPurify requires a DOM environment (browser).
 * If SSR is added in the future, use 'isomorphic-dompurify' instead.
 */
export function sanitizeContent(content: string | null | undefined): string {
  if (!content) return '';

  // Use DOMPurify with strict configuration
  // ALLOWED_TAGS: [] means strip ALL HTML tags, keeping only text
  // This is appropriate for plain text content display
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // No HTML tags allowed - text only
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content from removed tags
  });
}

/**
 * Sanitize HTML content while preserving safe formatting tags.
 * Use this for rich text content where basic formatting is desired.
 */
export function sanitizeHtml(content: string | null | undefined): string {
  if (!content) return '';

  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
}

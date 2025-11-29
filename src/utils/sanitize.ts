/**
 * Sanitize text content to prevent XSS attacks.
 * Removes script tags and other potentially dangerous HTML elements.
 *
 * Note: For displaying user content, React already escapes HTML by default.
 * This provides an additional layer of defense for content from external sources.
 */
export function sanitizeContent(content: string | null | undefined): string {
  if (!content) return '';

  return (
    content
      // Remove script tags and their contents
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove onclick, onerror, and other event handlers
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove javascript: URLs
      .replace(/javascript\s*:/gi, '')
      // Remove data: URLs that could contain scripts
      .replace(/data\s*:\s*text\/html/gi, '')
  );
}

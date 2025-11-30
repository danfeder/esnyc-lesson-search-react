import { describe, it, expect } from 'vitest';
import { sanitizeContent, sanitizeHtml } from './sanitize';

describe('sanitizeContent', () => {
  it('returns empty string for null/undefined', () => {
    expect(sanitizeContent(null)).toBe('');
    expect(sanitizeContent(undefined)).toBe('');
    expect(sanitizeContent('')).toBe('');
  });

  it('passes through plain text unchanged', () => {
    expect(sanitizeContent('Hello, World!')).toBe('Hello, World!');
    expect(sanitizeContent('Simple text content')).toBe('Simple text content');
  });

  it('removes script tags and their contents', () => {
    expect(sanitizeContent('<script>alert("xss")</script>')).toBe('');
    expect(sanitizeContent('Before<script>evil()</script>After')).toBe('BeforeAfter');
    expect(sanitizeContent('<script src="evil.js"></script>')).toBe('');
  });

  it('removes script tags with variations', () => {
    // Handles spacing variations
    expect(sanitizeContent('<script >alert(1)</script >')).toBe('');
    expect(sanitizeContent('<SCRIPT>alert(1)</SCRIPT>')).toBe('');
  });

  it('removes event handlers', () => {
    expect(sanitizeContent('<img onerror="alert(1)">')).toBe('');
    expect(sanitizeContent('<div onclick="evil()">Click me</div>')).toBe('Click me');
    expect(sanitizeContent('<body onload="init()">')).toBe('');
  });

  it('removes javascript: URLs', () => {
    expect(sanitizeContent('<a href="javascript:alert(1)">Click</a>')).toBe('Click');
  });

  it('removes dangerous tags', () => {
    expect(sanitizeContent('<iframe src="evil.html"></iframe>')).toBe('');
    expect(sanitizeContent('<object data="evil.swf"></object>')).toBe('');
    expect(sanitizeContent('<embed src="evil.swf">')).toBe('');
  });

  it('preserves text content from removed tags', () => {
    expect(sanitizeContent('<div>Hello</div>')).toBe('Hello');
    expect(sanitizeContent('<p>Paragraph text</p>')).toBe('Paragraph text');
    expect(sanitizeContent('<b>Bold</b> and <i>italic</i>')).toBe('Bold and italic');
  });

  it('preserves HTML entities without executing them', () => {
    // Encoded tags should stay encoded (safe)
    expect(sanitizeContent('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(sanitizeContent('Tom &amp; Jerry')).toBe('Tom &amp; Jerry');
    expect(sanitizeContent('&copy; 2024')).toBe('&copy; 2024');
  });
});

describe('sanitizeHtml', () => {
  it('returns empty string for null/undefined', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('preserves safe formatting tags', () => {
    expect(sanitizeHtml('<b>Bold</b>')).toBe('<b>Bold</b>');
    expect(sanitizeHtml('<i>Italic</i>')).toBe('<i>Italic</i>');
    expect(sanitizeHtml('<em>Emphasis</em>')).toBe('<em>Emphasis</em>');
    expect(sanitizeHtml('<strong>Strong</strong>')).toBe('<strong>Strong</strong>');
  });

  it('preserves list tags', () => {
    expect(sanitizeHtml('<ul><li>Item</li></ul>')).toBe('<ul><li>Item</li></ul>');
    expect(sanitizeHtml('<ol><li>Item</li></ol>')).toBe('<ol><li>Item</li></ol>');
  });

  it('removes dangerous tags but keeps content', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe('');
    expect(sanitizeHtml('<div>Text</div>')).toBe('Text');
  });

  it('removes attributes from allowed tags', () => {
    expect(sanitizeHtml('<b onclick="evil()">Text</b>')).toBe('<b>Text</b>');
    expect(sanitizeHtml('<p style="color:red">Text</p>')).toBe('<p>Text</p>');
  });
});

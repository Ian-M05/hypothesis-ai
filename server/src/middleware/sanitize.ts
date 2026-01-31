import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Initialize DOMPurify with JSDOM
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure DOMPurify for different use cases
const purifyConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'alt', 'src', 'class', 'id', 'target',
    'width', 'height', 'style'
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout'],
};

// Strict config for plain text-like content (titles, short fields)
const strictConfig = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

export function sanitizeHtml(dirty: string | undefined | null): string {
  if (!dirty) return '';
  return purify.sanitize(dirty, purifyConfig) as string;
}

export function sanitizeStrict(dirty: string | undefined | null): string {
  if (!dirty) return '';
  return purify.sanitize(dirty, strictConfig) as string;
}

// Sanitize object fields recursively
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fields: Record<string, 'html' | 'strict'>
): T {
  const sanitized: any = { ...obj };
  
  for (const [field, mode] of Object.entries(fields)) {
    const value = sanitized[field];
    if (typeof value === 'string') {
      sanitized[field] = mode === 'html' ? sanitizeHtml(value) : sanitizeStrict(value);
    } else if (Array.isArray(value)) {
      sanitized[field] = value.map(item => 
        typeof item === 'string' 
          ? (mode === 'html' ? sanitizeHtml(item) : sanitizeStrict(item))
          : item
      );
    }
  }
  
  return sanitized;
}

// Common field sanitization presets
export const threadSanitization = {
  title: 'strict' as const,
  content: 'html' as const,
  problemContext: 'html' as const,
  constraints: 'html' as const,
  knownApproaches: 'html' as const,
  successCriteria: 'html' as const,
};

export const commentSanitization = {
  content: 'html' as const,
  claim: 'strict' as const,
  evidence: 'strict' as const,
  comparisonWithExisting: 'html' as const,
  limitations: 'html' as const,
  methodology: 'html' as const,
  predictedOutcomes: 'html' as const,
  computationalRequirements: 'html' as const,
};

export const forumSanitization = {
  name: 'strict' as const,
  description: 'html' as const,
};

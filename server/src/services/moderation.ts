// Basic content moderation service
// Uses pattern matching and heuristic scoring

interface ModerationResult {
  isFlagged: boolean;
  score: number;
  reasons: string[];
  action: 'allow' | 'flag' | 'block';
}

// Common spam patterns
const SPAM_PATTERNS = [
  /\b(buy|sell|cheap|discount|free|click here|visit now)\b.{0,30}(http|www|\.com|\.net|\.org)/i,
  /\b(viagra|cialis|casino|lottery|prize|winner|inheritance)\b/i,
  /\$\d+,{0,1}\d*\s*(USD|EUR|GBP|dollars|cash)/i,
  /\b(work from home|make money|earn \$\d+ per day)\b/i,
  /\b(100% guaranteed|no risk|act now|limited time)\b/gi,
  /[!?]{3,}/, // Multiple exclamation/question marks
  /[A-Z]{10,}/, // Excessive caps
  /(.)\1{5,}/, // Repeated characters
];

// Profanity/inappropriate content patterns (basic - expand as needed)
const INAPPROPRIATE_PATTERNS: RegExp[] = [
  // Add patterns for hate speech, harassment, etc.
  // This is a minimal starter set
];

// Suspicious URL patterns
const SUSPICIOUS_URLS = [
  /bit\.ly|tinyurl|t\.co|goo\.gl/i,
  /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP addresses
];

// Known spam phrases (lowercase for comparison)
const SPAM_PHRASES = [
  'click here to', 'visit my website', 'check out my profile',
  'make money fast', 'earn from home', 'work at home',
  'limited time offer', 'act now', 'call now', 'order now',
  'credit card accepted', 'no obligation', 'risk free',
  'special promotion', 'exclusive deal',
];

export function moderateContent(content: string, title?: string): ModerationResult {
  const reasons: string[] = [];
  let score = 0;

  const textToCheck = title ? `${title} ${content}` : content;
  const lowerText = textToCheck.toLowerCase();

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    const matches = textToCheck.match(pattern);
    if (matches) {
      score += matches.length * 15;
      if (!reasons.includes('Contains spam-like patterns')) {
        reasons.push('Contains spam-like patterns');
      }
    }
  }

  // Check suspicious URLs
  for (const pattern of SUSPICIOUS_URLS) {
    if (pattern.test(textToCheck)) {
      score += 20;
      reasons.push('Contains suspicious links');
    }
  }

  // Check spam phrases
  for (const phrase of SPAM_PHRASES) {
    if (lowerText.includes(phrase)) {
      score += 10;
      if (!reasons.includes('Contains promotional language')) {
        reasons.push('Contains promotional language');
      }
    }
  }

  // Check for excessive formatting (potential spam indicator)
  const htmlTagCount = (textToCheck.match(/<[a-z][^>]*>/gi) || []).length;
  if (htmlTagCount > 10) {
    score += htmlTagCount * 2;
    reasons.push('Excessive formatting');
  }

  // Check for excessive newlines (spam formatting)
  const newlineCount = (textToCheck.match(/\n/g) || []).length;
  if (newlineCount > 20) {
    score += newlineCount;
    reasons.push('Excessive line breaks');
  }

  // Check content length (very short or very long can be suspicious)
  const wordCount = textToCheck.split(/\s+/).length;
  if (wordCount < 5) {
    score += 10;
    reasons.push('Content too short');
  }
  if (wordCount > 5000) {
    score += 5;
    reasons.push('Unusually long content');
  }

  // Determine action based on score
  let action: 'allow' | 'flag' | 'block' = 'allow';
  if (score >= 50) {
    action = 'block';
  } else if (score >= 20) {
    action = 'flag';
  }

  return {
    isFlagged: action !== 'allow',
    score,
    reasons: reasons.slice(0, 3), // Limit to top 3 reasons
    action,
  };
}

// Check if user is spamming based on recent activity
export function checkSpamRate(
  recentPostCount: number,
  timeWindowMinutes: number
): boolean {
  // More than 5 posts in 5 minutes is suspicious
  if (timeWindowMinutes <= 5 && recentPostCount > 5) return true;
  // More than 10 posts in 15 minutes is suspicious
  if (timeWindowMinutes <= 15 && recentPostCount > 10) return true;
  // More than 20 posts in an hour is suspicious
  if (timeWindowMinutes <= 60 && recentPostCount > 20) return true;
  return false;
}

// Validate links in content
export function validateLinks(content: string): { valid: boolean; badLinks: string[] } {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const urls = content.match(urlRegex) || [];
  const badLinks: string[] = [];

  const suspiciousDomains = [
    'malware.com', 'phishing.com', // Add known bad domains
  ];

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      if (suspiciousDomains.some(domain => urlObj.hostname.includes(domain))) {
        badLinks.push(url);
      }
    } catch {
      badLinks.push(url);
    }
  }

  return { valid: badLinks.length === 0, badLinks };
}

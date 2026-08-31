/**
 * Normalizes any Reddit post URL to use the old.reddit.com domain.
 * If the URL already uses old.reddit.com, it is returned intact.
 *
 * @param {string} rawUrl - The input Reddit URL
 * @returns {string} - The normalized old.reddit.com URL
 */
export function normalizeToOldRedditUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    
    if (host.includes('reddit.com')) {
      if (!host.startsWith('old.')) {
        parsed.hostname = 'old.reddit.com';
      }
      return parsed.toString();
    }
    return trimmed;
  } catch {
    // If URL constructor fails, attempt regex replacement
    if (trimmed.includes('reddit.com') && !trimmed.includes('old.reddit.com')) {
      return trimmed.replace(/https?:\/\/(www\.|new\.|np\.)?reddit\.com/, 'https://old.reddit.com');
    }
    return trimmed;
  }
}

/**
 * Validates if the string is a valid Reddit post URL
 *
 * @param {string} url - The URL to validate
 * @returns {boolean}
 */
export function isValidRedditUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname.includes('reddit.com') && parsed.pathname.includes('/comments/');
  } catch {
    return false;
  }
}

/**
 * Extracts basic post metadata (subreddit, postId, slug) from a Reddit URL
 *
 * @param {string} url
 * @returns {{ subreddit?: string, postId?: string, title?: string }}
 */
export function extractPostMetadata(url) {
  try {
    const parsed = new URL(normalizeToOldRedditUrl(url));
    const parts = parsed.pathname.split('/').filter(Boolean);
    // standard old reddit format: /r/{subreddit}/comments/{postId}/{slug}
    const rIndex = parts.indexOf('r');
    if (rIndex !== -1 && parts.length > rIndex + 3) {
      return {
        subreddit: parts[rIndex + 1],
        postId: parts[rIndex + 3],
        title: parts[rIndex + 4] || ''
      };
    }
  } catch {
    // ignore
  }
  return {};
}

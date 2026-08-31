import { parse } from 'node-html-parser';

/**
 * Normalizes any Reddit post URL to use the old.reddit.com domain.
 */
function normalizeToOldRedditUrl(rawUrl) {
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
    if (trimmed.includes('reddit.com') && !trimmed.includes('old.reddit.com')) {
      return trimmed.replace(/https?:\/\/(www\.|new\.|np\.)?reddit\.com/, 'https://old.reddit.com');
    }
    return trimmed;
  }
}

/**
 * Decodes HTML entities
 */
function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Extracts clean text from an HTML node
 */
function extractCleanText(node) {
  if (!node) return '';
  const paragraphs = node.querySelectorAll('p, blockquote, li');
  if (paragraphs && paragraphs.length > 0) {
    const lines = paragraphs
      .map((p) => decodeHtmlEntities((p.textContent || '').trim()))
      .filter((t) => t.length > 0);
    return lines.join('\n\n');
  }
  return decodeHtmlEntities((node.textContent || '').trim());
}

/**
 * Validates if the comment node is top-level (not a reply)
 */
function isTopLevelComment(commentElement) {
  if (!commentElement) return false;

  const dataParent = commentElement.getAttribute('data-parent');
  if (dataParent) {
    if (dataParent.startsWith('t3_')) return true; // t3_ is a link/post submission
    if (dataParent.startsWith('t1_')) return false; // t1_ is a comment reply
  }

  let parent = commentElement.parentNode;
  while (parent) {
    if (parent.classList && (parent.classList.contains('child') || parent.classList.contains('nestedlisting-child'))) {
      return false;
    }
    if (parent.classList && parent.classList.contains('commentarea')) {
      return true;
    }
    parent = parent.parentNode;
  }

  return true;
}

/**
 * Parses old.reddit.com HTML to extract top-level comments and commenter usernames.
 */
function parseRedditComments(html) {
  if (!html || typeof html !== 'string') return [];

  const root = parse(html);
  const comments = [];

  // 1. Old Reddit structure
  const commentArea = root.querySelector('.commentarea');
  if (commentArea) {
    const topSiteTable = commentArea.querySelector('.sitetable.nestedlisting') || commentArea.querySelector('.sitetable');
    const allComments = (topSiteTable || commentArea).querySelectorAll('.thing.comment');

    for (const commentEl of allComments) {
      if (!isTopLevelComment(commentEl)) {
        continue;
      }

      // Username extraction
      let username = commentEl.getAttribute('data-author');
      if (!username) {
        const authorEl = commentEl.querySelector('a.author') || commentEl.querySelector('.tagline .author');
        username = authorEl ? authorEl.textContent.trim() : '[deleted]';
      }

      // Comment text extraction
      const userTextBody = commentEl.querySelector('.entry .usertext-body .md') ||
                           commentEl.querySelector('.usertext-body .md') ||
                           commentEl.querySelector('.usertext-body');

      const commentText = extractCleanText(userTextBody);

      if (commentText || username !== '[deleted]') {
        comments.push({
          username: username || '[anonymous]',
          comment: commentText
        });
      }
    }

    if (comments.length > 0) {
      return comments;
    }
  }

  // 2. Modern Reddit fallback (shreddit-comment)
  const shredditComments = root.querySelectorAll('shreddit-comment');
  if (shredditComments && shredditComments.length > 0) {
    for (const commentEl of shredditComments) {
      const depth = commentEl.getAttribute('depth') || commentEl.getAttribute('data-depth');
      if (depth !== null && depth !== '0') {
        continue;
      }

      const username = commentEl.getAttribute('author') ||
                       commentEl.querySelector('.author')?.textContent?.trim() ||
                       '[deleted]';

      const commentBodyEl = commentEl.querySelector('[slot="comment"]') ||
                            commentEl.querySelector('.md') ||
                            commentEl.querySelector('div[id$="-comment-rtjson-content"]');

      const commentText = extractCleanText(commentBodyEl);

      if (commentText || username !== '[deleted]') {
        comments.push({
          username: username || '[anonymous]',
          comment: commentText
        });
      }
    }
  }

  return comments;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

async function scrapeSingleUrl(rawUrl) {
  const normalizedUrl = normalizeToOldRedditUrl(rawUrl);
  if (!normalizedUrl) {
    throw new Error('Invalid Reddit URL provided');
  }

  const response = await fetch(normalizedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cookie': 'over18=1'
    },
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Reddit HTTP error ${response.status} (${response.statusText})`);
  }

  const html = await response.text();
  const comments = parseRedditComments(html);

  return {
    url: normalizedUrl,
    originalUrl: rawUrl,
    count: comments.length,
    comments
  };
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required query parameter "url"'
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const result = await scrapeSingleUrl(targetUrl);

    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Failed to scrape Reddit comments'
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function onRequestPost(context) {
  try {
    let body = {};
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON request body'
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Handle single URL or list of URLs
    if (body.url && typeof body.url === 'string') {
      const result = await scrapeSingleUrl(body.url);
      return new Response(
        JSON.stringify({
          success: true,
          ...result
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    } else if (Array.isArray(body.urls) && body.urls.length > 0) {
      const results = [];
      for (const u of body.urls) {
        try {
          const res = await scrapeSingleUrl(u);
          results.push({ success: true, ...res });
        } catch (itemErr) {
          results.push({
            success: false,
            url: u,
            error: itemErr.message || 'Failed to scrape URL'
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          results
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request body must contain "url" (string) or "urls" (array)'
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Failed to scrape Reddit comments'
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

import { parse } from 'node-html-parser';

/**
 * Decodes standard HTML entities in text strings
 *
 * @param {string} text
 * @returns {string}
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
 * Extracts clean, human-readable text from a comment body HTML node
 *
 * @param {HTMLElement} node
 * @returns {string}
 */
function extractCleanText(node) {
  if (!node) return '';

  // Process paragraphs, blockquotes, and linebreaks
  const paragraphs = node.querySelectorAll('p, blockquote, li');
  if (paragraphs && paragraphs.length > 0) {
    const textLines = paragraphs
      .map((p) => {
        let t = p.textContent || '';
        return decodeHtmlEntities(t.trim());
      })
      .filter((line) => line.length > 0);

    return textLines.join('\n\n');
  }

  // Fallback to raw textContent
  let rawText = node.textContent || '';
  return decodeHtmlEntities(rawText.trim());
}

/**
 * Checks if a comment element is top-level (not a reply)
 *
 * @param {HTMLElement} commentElement
 * @returns {boolean}
 */
function isTopLevelComment(commentElement) {
  if (!commentElement) return false;

  // Check 1: data-parent starts with t3_ (t3_ indicates parent is the post/link submission)
  const dataParent = commentElement.getAttribute('data-parent');
  if (dataParent) {
    if (dataParent.startsWith('t3_')) return true;
    if (dataParent.startsWith('t1_')) return false; // t1_ indicates parent is another comment (reply)
  }

  // Check 2: Verify it has no ancestor with class "child"
  let parent = commentElement.parentNode;
  while (parent) {
    if (parent.classList && (parent.classList.contains('child') || parent.classList.contains('nestedlisting-child'))) {
      return false;
    }
    // Reached top-level commentarea or body
    if (parent.classList && parent.classList.contains('commentarea')) {
      return true;
    }
    parent = parent.parentNode;
  }

  return true;
}

/**
 * Parses old.reddit.com HTML structure to extract top-level comments and usernames.
 *
 * @param {string} html - Raw HTML of the Reddit post page
 * @returns {Array<{ username: string, comment: string }>}
 */
export function parseOldRedditHtml(html) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  const root = parse(html);
  const results = [];

  // Strategy A: Old Reddit DOM (.commentarea -> .sitetable -> .thing.comment)
  const commentArea = root.querySelector('.commentarea');
  
  if (commentArea) {
    // Look for top-level sitetable
    const topSiteTable = commentArea.querySelector('.sitetable.nestedlisting') || commentArea.querySelector('.sitetable');
    
    // Find all comment elements
    const allComments = (topSiteTable || commentArea).querySelectorAll('.thing.comment');

    for (const commentEl of allComments) {
      if (!isTopLevelComment(commentEl)) {
        continue;
      }

      // 1. Extract Username
      let username = commentEl.getAttribute('data-author');
      if (!username) {
        const authorEl = commentEl.querySelector('a.author') || commentEl.querySelector('.tagline .author');
        username = authorEl ? authorEl.textContent.trim() : '[deleted]';
      }

      // 2. Extract Comment Body
      const userTextBody = commentEl.querySelector('.entry .usertext-body .md') ||
                           commentEl.querySelector('.usertext-body .md') ||
                           commentEl.querySelector('.usertext-body');

      const commentText = extractCleanText(userTextBody);

      // Only add valid comments (exclude empty deleted placeholders if no content)
      if (commentText || username !== '[deleted]') {
        results.push({
          username: username || '[anonymous]',
          comment: commentText
        });
      }
    }

    if (results.length > 0) {
      return results;
    }
  }

  // Strategy B: Modern Reddit fallback (shreddit-comment elements)
  const shredditComments = root.querySelectorAll('shreddit-comment');
  if (shredditComments && shredditComments.length > 0) {
    for (const commentEl of shredditComments) {
      const depth = commentEl.getAttribute('depth') || commentEl.getAttribute('data-depth');
      // Only depth 0 represents top-level comments
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
        results.push({
          username: username || '[anonymous]',
          comment: commentText
        });
      }
    }

    if (results.length > 0) {
      return results;
    }
  }

  // Strategy C: Generic fallback for other Reddit HTML variations
  const genericComments = root.querySelectorAll('div[data-testid="comment"]');
  if (genericComments && genericComments.length > 0) {
    for (const commentEl of genericComments) {
      // Check depth / level
      const depth = commentEl.getAttribute('data-depth');
      if (depth && depth !== '0') {
        continue;
      }

      const authorEl = commentEl.querySelector('a[href*="/user/"]') || commentEl.querySelector('[data-testid="comment_author"]');
      const username = authorEl ? authorEl.textContent.trim().replace(/^u\//, '') : '[deleted]';

      const bodyEl = commentEl.querySelector('div[data-testid="comment"]') ||
                     commentEl.querySelector('.md') ||
                     commentEl.querySelector('p');

      const commentText = extractCleanText(bodyEl);

      results.push({
        username: username || '[anonymous]',
        comment: commentText
      });
    }
  }

  return results;
}

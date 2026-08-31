# Vote — Reddit Comment Scraper

A lightweight, server-side Reddit comment scraper built with **React**, **Vite**, and **Cloudflare Pages & Functions**.

## Core Objective

Establish a reliable mechanism that:
1. Reads Reddit post URLs from [`data.json`](file:///data/data/com.termux/files/home/Vote_2026-08-31_10-15/data.json).
2. Automatically normalizes any Reddit URL to `old.reddit.com`.
3. Fetches the Reddit HTML server-side via Cloudflare Functions (preventing client-side CORS issues).
4. Analyzes the HTML structure of the Reddit post page.
5. Extracts **only top-level comments** (ignoring all replies) and their corresponding commenter usernames.
6. Returns clean JSON data `[ { "username": "user1", "comment": "Comment A" } ]`.
7. Displays the extracted username + comment pairs on the React frontend.

---

## Architecture

```
React / Vite Frontend (Cloudflare Pages)
         │
         │ (POST /api/scrape with { url })
         ▼
Cloudflare Function (/functions/api/scrape.js)
         │
         │ (Server-side fetch with browser headers)
         ▼
Fetch Reddit HTML (old.reddit.com)
         │
         │ (node-html-parser)
         ▼
Analyze & Parse DOM Tree
 ├── Identify top-level .thing.comment elements
 ├── Ensure no .child ancestor (ignores replies)
 ├── Extract commenter data-author / a.author
 └── Extract text body .usertext-body .md
         │
         │ (JSON payload)
         ▼
Return Top-Level Comments JSON
         │
         ▼
React Frontend Display & Copy Tools
```

---

## HTML Structure Analysis (Old Reddit)

Our server-side parser relies on the actual DOM structure of `old.reddit.com`:

| Element | Old Reddit Selector / Attribute | Description |
|---|---|---|
| **Comments Container** | `.commentarea > .sitetable` | Top-level container for post comments. |
| **Comment Element** | `div.thing.comment` | Represents an individual comment thread/item. |
| **Top-Level Identifier** | Direct child of root `.sitetable` / `data-parent="t3_..."` / No `.child` ancestor | Replies are encapsulated in `<div class="child">...</div>`. Only comments without a `.child` ancestor are extracted. |
| **Commenter Username** | `data-author` attribute or `a.author` | Username of the commenter (or `[deleted]`). |
| **Comment Body** | `.entry .usertext-body .md` | Clean markdown rendered comment body text. |

---

## Top-Level vs. Replies Logic

```
Post
 ├── Comment A        ← EXTRACTED
 │    ├── Reply A1    ← IGNORED
 │    └── Reply A2    ← IGNORED
 │
 ├── Comment B        ← EXTRACTED
 │    └── Reply B1    ← IGNORED
 │
 └── Comment C        ← EXTRACTED
```

The output JSON structure strictly follows:
```json
[
  {
    "username": "user1",
    "comment": "Comment A"
  },
  {
    "username": "user2",
    "comment": "Comment B"
  }
]
```

---

## `data.json`

Reddit URLs are loaded from [`data.json`](file:///data/data/com.termux/files/home/Vote_2026-08-31_10-15/data.json):

```json
{
  "links": [
    "https://old.reddit.com/r/RealTeensIndia/comments/1w2cu3s/finally_the_truth_is_coming_out"
  ]
}
```

If a standard `reddit.com` or `www.reddit.com` URL is placed in `data.json`, the application automatically normalizes it to `old.reddit.com` before requesting.

---

## Cloudflare Pages Deployment

### Option 1: Direct Cloudflare Pages Git Integration
1. In Cloudflare Dashboard, go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select the repository `Brajesh2022/Vote`.
3. Configure build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Deploy! Cloudflare automatically provisions the serverless functions in `/functions`.

### Option 2: Wrangler CLI
```bash
npm run build
npx wrangler pages deploy dist
```

---

## Local Development

```bash
# Install dependencies
npm install

# Run frontend with Vite
npm run dev

# Or run with Cloudflare Pages Functions locally
npx wrangler pages dev --compatibility-date=2024-09-01
```

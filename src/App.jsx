import React, { useState, useEffect } from 'react';
import { Bot, ShieldCheck, Server, AlertCircle } from 'lucide-react';
import UrlSelector from './components/UrlSelector';
import CommentList from './components/CommentList';
import { normalizeToOldRedditUrl } from './utils/urlHelper';

const INITIAL_DEFAULT_LINKS = [
  "https://old.reddit.com/r/RealTeensIndia/comments/1w2cu3s/finally_the_truth_is_coming_out"
];

export default function App() {
  const [links, setLinks] = useState(INITIAL_DEFAULT_LINKS);
  const [selectedUrl, setSelectedUrl] = useState(INITIAL_DEFAULT_LINKS[0]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastScrapedUrl, setLastScrapedUrl] = useState('');

  // 1. Read Reddit post URLs from "data.json"
  useEffect(() => {
    async function loadDataJson() {
      try {
        const res = await fetch('/data.json');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.links) && data.links.length > 0) {
            // Auto-normalize any reddit url to old.reddit.com
            const normalizedLinks = data.links.map(normalizeToOldRedditUrl);
            setLinks(normalizedLinks);
            setSelectedUrl(normalizedLinks[0]);
          }
        }
      } catch (err) {
        console.warn('Could not fetch data.json, using default links:', err);
      }
    }
    loadDataJson();
  }, []);

  // 2. Fetch comments server-side via Cloudflare Function
  const handleScrape = async (urlToScrape) => {
    const targetUrl = normalizeToOldRedditUrl(urlToScrape || selectedUrl);
    if (!targetUrl) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch server-side through Cloudflare Function (/api/scrape)
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }

      setComments(data.comments || []);
      setLastScrapedUrl(data.url || targetUrl);
    } catch (err) {
      console.error('Scrape request failed:', err);
      setError(err.message || 'Failed to fetch Reddit comments');
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-badge">
          <Bot size={18} />
          <span>Reddit Comment Scraper</span>
        </div>
        <h1>Vote — Server-Side Comment Extractor</h1>
        <p className="header-subtitle">
          Extracts only <strong>top-level comments</strong> and commenter usernames via server-side Cloudflare Functions.
        </p>

        <div className="architecture-pills">
          <span className="pill"><Server size={14} /> Cloudflare Functions (Server-Side)</span>
          <span className="pill"><ShieldCheck size={14} /> No Client CORS</span>
          <span className="pill"><code>old.reddit.com</code> Normalized</span>
        </div>
      </header>

      <main className="app-main">
        <UrlSelector
          links={links}
          selectedUrl={selectedUrl}
          onSelectUrl={setSelectedUrl}
          onScrape={handleScrape}
          loading={loading}
        />

        <CommentList
          comments={comments}
          targetUrl={lastScrapedUrl || selectedUrl}
          loading={loading}
          error={error}
        />
      </main>

      <footer className="app-footer">
        <p>Built with React + Vite + Cloudflare Pages & Functions</p>
      </footer>
    </div>
  );
}

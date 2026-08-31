import React, { useState } from 'react';
import { Globe, Link as LinkIcon, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { normalizeToOldRedditUrl } from '../utils/urlHelper';

export default function UrlSelector({
  links,
  selectedUrl,
  onSelectUrl,
  onScrape,
  loading
}) {
  const [customUrl, setCustomUrl] = useState('');
  const [mode, setMode] = useState('data-json'); // 'data-json' | 'custom'

  const normalizedCurrent = normalizeToOldRedditUrl(selectedUrl);

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    const normalized = normalizeToOldRedditUrl(customUrl);
    onSelectUrl(normalized);
    onScrape(normalized);
  };

  return (
    <section className="url-selector-card">
      <div className="selector-tabs">
        <button
          className={`tab-btn ${mode === 'data-json' ? 'active' : ''}`}
          onClick={() => setMode('data-json')}
        >
          <Globe size={16} />
          <span>From data.json ({links.length})</span>
        </button>
        <button
          className={`tab-btn ${mode === 'custom' ? 'active' : ''}`}
          onClick={() => setMode('custom')}
        >
          <LinkIcon size={16} />
          <span>Custom URL</span>
        </button>
      </div>

      {mode === 'data-json' ? (
        <div className="selector-body">
          <div className="form-group">
            <label htmlFor="reddit-url-select">Select Reddit Post URL:</label>
            <div className="select-wrapper">
              <select
                id="reddit-url-select"
                className="url-select"
                value={selectedUrl}
                onChange={(e) => onSelectUrl(e.target.value)}
                disabled={loading}
              >
                {links.map((link, idx) => (
                  <option key={idx} value={link}>
                    {link}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="url-info-row">
            <div className="normalized-badge">
              <span className="badge-label">Target URL (old.reddit):</span>
              <code className="normalized-url">{normalizedCurrent}</code>
              <a
                href={normalizedCurrent}
                target="_blank"
                rel="noreferrer"
                className="external-link"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
              </a>
            </div>

            <button
              className="primary-btn"
              onClick={() => onScrape(selectedUrl)}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
              <span>{loading ? 'Scraping...' : 'Scrape Comments'}</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCustomSubmit} className="selector-body">
          <div className="form-group">
            <label htmlFor="custom-reddit-url">Enter any Reddit URL:</label>
            <div className="input-with-button">
              <input
                id="custom-reddit-url"
                type="url"
                className="url-input"
                placeholder="https://www.reddit.com/r/.../comments/..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="submit"
                className="primary-btn"
                disabled={loading || !customUrl.trim()}
              >
                <Sparkles size={16} />
                <span>{loading ? 'Scraping...' : 'Scrape'}</span>
              </button>
            </div>
          </div>
          <p className="helper-text">
            URL will automatically be normalized to <code>old.reddit.com</code> before server-side scraping.
          </p>
        </form>
      )}
    </section>
  );
}

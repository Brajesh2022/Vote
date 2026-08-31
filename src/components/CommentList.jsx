import React, { useState } from 'react';
import { MessageSquare, Code, Copy, Check, Filter } from 'lucide-react';
import CommentCard from './CommentCard';

export default function CommentList({ comments, targetUrl, loading, error }) {
  const [showJson, setShowJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(comments, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const filteredComments = comments.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.username && c.username.toLowerCase().includes(term)) ||
      (c.comment && c.comment.toLowerCase().includes(term))
    );
  });

  return (
    <section className="comments-section">
      <div className="comments-header">
        <div className="header-title-group">
          <MessageSquare size={20} className="header-icon" />
          <h2>Top-Level Comments</h2>
          <span className="count-pill">{comments.length}</span>
        </div>

        {comments.length > 0 && (
          <div className="header-actions">
            <button
              className="action-btn"
              onClick={() => setShowJson(!showJson)}
              title="Toggle JSON view"
            >
              <Code size={16} />
              <span>{showJson ? 'Card View' : 'Raw JSON'}</span>
            </button>

            <button
              className="action-btn"
              onClick={handleCopyJson}
              title="Copy comments JSON dataset"
            >
              {copiedJson ? <Check size={16} className="copied-icon" /> : <Copy size={16} />}
              <span>{copiedJson ? 'JSON Copied' : 'Copy JSON'}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <strong>Scraping Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Fetching Reddit HTML server-side & parsing top-level comments...</p>
        </div>
      ) : showJson ? (
        <div className="json-container">
          <pre className="json-viewer">
            <code>{JSON.stringify(comments, null, 2)}</code>
          </pre>
        </div>
      ) : comments.length > 0 ? (
        <>
          {comments.length > 5 && (
            <div className="search-bar-row">
              <Filter size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Filter comments by username or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          )}

          <div className="comments-grid">
            {filteredComments.map((comment, index) => (
              <CommentCard
                key={`${comment.username}-${index}`}
                comment={comment}
                index={index}
              />
            ))}
          </div>

          {filteredComments.length === 0 && (
            <p className="no-matches">No comments match "{searchTerm}"</p>
          )}
        </>
      ) : (
        !error && (
          <div className="empty-state">
            <p>No comments scraped yet. Select or enter a Reddit URL above and click <strong>Scrape Comments</strong>.</p>
          </div>
        )
      )}
    </section>
  );
}

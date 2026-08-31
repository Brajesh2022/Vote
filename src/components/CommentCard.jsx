import React, { useState } from 'react';
import { User, Copy, Check } from 'lucide-react';

export default function CommentCard({ comment, index }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${comment.username}: ${comment.comment}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="comment-card">
      <div className="comment-card-header">
        <div className="comment-user">
          <div className="user-avatar">
            <User size={16} />
          </div>
          <span className="user-name">u/{comment.username}</span>
          <span className="comment-index-badge">#{index + 1}</span>
          <span className="toplevel-badge">Top-Level</span>
        </div>
        <button
          className="copy-btn"
          onClick={handleCopy}
          title="Copy comment to clipboard"
          aria-label="Copy comment"
        >
          {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="comment-body">
        {comment.comment ? (
          comment.comment.split('\n\n').map((paragraph, pIdx) => (
            <p key={pIdx}>{paragraph}</p>
          ))
        ) : (
          <p className="comment-empty"><em>[No text content]</em></p>
        )}
      </div>
    </article>
  );
}

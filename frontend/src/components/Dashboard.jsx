import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  BarChart2,
  Files,
  Code,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import ChatWidget from './ChatWidget';

export default function Dashboard({ org, onLogout }) {
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [history, setHistory] = useState([]);
  const [assistantToken, setAssistantToken] = useState(
    localStorage.getItem('psi_assistant_token') || ''
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const token = localStorage.getItem('psi_token');

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/assistant/analytics/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.conversations) {
        setHistory(data.conversations);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchHistory();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds maximum size of 10 MB.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadSuccess(`Successfully processed "${data.document.filename}" (${data.document.pageCount} pages, ${data.document.chunksCreated} chunks indexed).`);
      fetchDocuments();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchDocuments();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const copyToClipboard = (text, setter) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const publicChatUrl = `${window.location.origin}/chat/${assistantToken}`;
  const embedCode = `<iframe src="${publicChatUrl}" width="400" height="600" style="border:none;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.4);" title="${org.name} Assistant"></iframe>`;

  const totalPages = documents.reduce((sum, d) => sum + (d.page_count || 0), 0);

  return (
    <div className="main-content">
      {}
      <div className="token-banner">
        <div className="token-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3>Assistant Token & Public Endpoint</h3>
            <span className="badge badge-green">Active</span>
          </div>
          <p>Share this token or public URL with your students or integrate on your website.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="token-code">
            <span>{assistantToken.substring(0, 16)}...</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => copyToClipboard(assistantToken, setCopiedToken)}
              title="Copy Token"
            >
              {copiedToken ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              {copiedToken ? 'Copied' : 'Copy'}
            </button>
          </div>

          <a
            href={`/chat/${assistantToken}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-sm"
          >
            <ExternalLink size={14} />
            Open Public Chat
          </a>
        </div>
      </div>

      {}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Uploaded Documents</div>
          <div className="stat-value">
            {documents.length} <span style={{ fontSize: '0.95rem', color: 'var(--text-dim)', fontWeight: '400' }}>/ 10 max</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Indexed Pages</div>
          <div className="stat-value">{totalPages}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Inquiries Answered</div>
          <div className="stat-value">{history.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Vector Search Precision</div>
          <div className="stat-value" style={{ color: '#34D399' }}>768-D</div>
        </div>
      </div>

      {}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <Files size={16} />
          Documents Knowledge Base
        </button>

        <button
          className={`tab-btn ${activeTab === 'test-chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('test-chat')}
        >
          <MessageSquare size={16} />
          Live Assistant Preview
        </button>

        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history');
            fetchHistory();
          }}
        >
          <BarChart2 size={16} />
          Queries & Analytics
        </button>

        <button
          className={`tab-btn ${activeTab === 'embed' ? 'active' : ''}`}
          onClick={() => setActiveTab('embed')}
        >
          <Code size={16} />
          Embed & Share
        </button>
      </div>

      {}
      {activeTab === 'documents' && (
        <>
          {}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Upload size={18} />
                  Upload Knowledge Document
                </h3>
                <p className="card-subtitle">
                  Upload official PDFs (Rules, Guidelines, FAQs, Notices). Up to 10 PDFs, max 20 pages and 10 MB per PDF.
                </p>
              </div>
            </div>

            {uploadError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#F87171', fontSize: '0.85rem', marginBottom: '16px' }}>
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#34D399', fontSize: '0.85rem', marginBottom: '16px' }}>
                {uploadSuccess}
              </div>
            )}

            <label className="upload-zone" style={{ display: 'block' }}>
              <input
                type="file"
                accept=".pdf,application/pdf"
                disabled={uploading || documents.length >= 10}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">
                {uploading ? (
                  <Sparkles size={32} className="animate-spin" color="var(--primary)" />
                ) : (
                  <FileText size={32} />
                )}
              </div>
              <div className="upload-text">
                {uploading
                  ? 'Extracting text, generating 768-D vectors & indexing...'
                  : documents.length >= 10
                  ? 'Maximum 10 documents limit reached.'
                  : 'Click to select or drop a PDF here'}
              </div>
              <div className="upload-hint">
                Supported format: PDF only • Max 20 pages • Auto-chunked & page-indexed
              </div>
            </label>
          </div>

          {}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FileText size={18} />
                Indexed Documents ({documents.length})
              </h3>
            </div>

            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px 0' }}>
                No documents uploaded yet. Upload a PDF above to activate your AI Assistant.
              </p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Pages</th>
                      <th>File Size</th>
                      <th>Uploaded On</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                            <FileText size={16} color="var(--badge-text)" />
                            {doc.original_name}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-blue">{doc.page_count} Pages</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete Document"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {}
      {activeTab === 'test-chat' && (
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">Live Assistant Preview</h3>
              <p className="card-subtitle">
                Test your assistant's answers and source citations in real-time.
              </p>
            </div>
            <span className="badge badge-blue">Interactive Test Mode</span>
          </div>
          <ChatWidget token={assistantToken} orgName={org.name} />
        </div>
      )}

      {}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Student Queries & Response Logs</h3>
              <p className="card-subtitle">
                Track what students are asking and inspect the AI grounded responses with citations.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchHistory}>
              Refresh Logs
            </button>
          </div>

          {history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px 0' }}>
              No inquiries recorded yet. Ask a question in the Live Assistant tab to see it logged here.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {history.map((conv) => (
                <div
                  key={conv.id}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      Q: {conv.user_query}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {new Date(conv.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: '1.5', marginBottom: '10px' }}>
                    {conv.ai_response}
                  </div>

                  {conv.sources && conv.sources.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {conv.sources.map((src, i) => (
                        <span key={i} className="source-tag">
                          📄 {src.document} (p. {src.page})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {}
      {activeTab === 'embed' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Embed & Direct Links</h3>
              <p className="card-subtitle">
                Place the AI chatbot onto any website, portal, or share direct links with students.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {}
            <div>
              <label className="form-label">Direct Student Chat Link</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  readOnly
                  value={publicChatUrl}
                  className="form-input"
                  style={{ flex: 1, backgroundColor: 'var(--bg-main)' }}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => copyToClipboard(publicChatUrl, setCopiedLink)}
                >
                  {copiedLink ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                  {copiedLink ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            </div>

            {}
            <div>
              <label className="form-label">Embeddable Iframe Code</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <textarea
                  readOnly
                  rows={3}
                  value={embedCode}
                  className="form-input"
                  style={{ flex: 1, backgroundColor: 'var(--bg-main)', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
                <button
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => copyToClipboard(embedCode, setCopiedEmbed)}
                >
                  {copiedEmbed ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                  {copiedEmbed ? 'Copied' : 'Copy HTML'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, FileText, Sparkles, AlertCircle } from 'lucide-react';

export default function ChatWidget({ token, orgName: initialOrgName }) {
  const [orgName, setOrgName] = useState(initialOrgName || 'Organization');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (!token) return;
    async function fetchAssistantInfo() {
      try {
        const res = await fetch(`/api/assistant/${token}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setOrgName(data.orgName);
          setMessages([
            {
              role: 'assistant',
              content: data.welcomeMessage || `Welcome to ${data.orgName}'s AI Assistant. How can I help you today?`,
              sources: [],
            },
          ]);
        } else {
          setError(data.error || 'Could not connect to assistant.');
        }
      } catch (err) {
        setError('Network error connecting to assistant.');
      } finally {
        setLoadingInfo(false);
      }
    }

    fetchAssistantInfo();
  }, [token]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/assistant/${token}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      const aiMsg = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue processing your query. Please try again.',
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    'What is the scholarship policy?',
    'What is the minimum attendance requirement?',
    'What happens if attendance is low?',
  ];

  if (loadingInfo) {
    return (
      <div className="chat-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading AI Assistant...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <AlertCircle size={36} color="var(--danger)" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Assistant Unavailable</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Bot size={18} />
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{orgName} Assistant</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#10B981' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
              Online & Grounded in Official Docs
            </div>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}
          >
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

            {msg.sources && msg.sources.length > 0 && (
              <div className="bubble-sources">
                <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', width: '100%', marginBottom: '2px' }}>
                  Verified Sources:
                </span>
                {msg.sources.map((s, idx) => (
                  <span key={idx} className="source-tag">
                    <FileText size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    {s.document} (Page {s.page})
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-bubble bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Sparkles size={16} className="animate-spin" />
            Searching documents & generating answer...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{ padding: '0 16px 12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInput(q);
              }}
              style={{
                background: 'rgba(31, 41, 55, 0.8)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="chat-input-area">
        <input
          type="text"
          placeholder="Ask any question from the uploaded documents..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="form-input"
          style={{ flex: 1, backgroundColor: 'var(--bg-main)' }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="btn btn-primary"
          style={{ padding: '0 18px' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

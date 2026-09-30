import React, { useState } from 'react';
import { Bot, LogOut } from 'lucide-react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ChatWidget from './components/ChatWidget';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('psi_token') || '');
  const [org, setOrg] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('psi_org') || 'null');
    } catch {
      return null;
    }
  });

  const pathname = window.location.pathname;
  const isChatRoute = pathname.startsWith('/chat/');
  const publicToken = isChatRoute ? pathname.split('/chat/')[1] : null;

  const handleAuthSuccess = (data) => {
    setToken(data.token);
    setOrg(data.org);
  };

  const handleLogout = () => {
    localStorage.removeItem('psi_token');
    localStorage.removeItem('psi_org');
    localStorage.removeItem('psi_assistant_token');
    setToken('');
    setOrg(null);
  };

  if (isChatRoute && publicToken) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        <ChatWidget token={publicToken} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {token && org ? (
        <>
          <nav className="navbar">
            <div className="nav-brand">
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Bot size={18} />
              </div>
              <span>PSI Assistant</span>
              <span className="brand-badge">Org Portal</span>
            </div>

            <div className="nav-actions">
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Signed in as <strong style={{ color: 'var(--text-main)' }}>{org.name}</strong>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </nav>

          <Dashboard org={org} onLogout={handleLogout} />
        </>
      ) : (
        <Auth onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

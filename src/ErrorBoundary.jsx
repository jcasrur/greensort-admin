// ErrorBoundary.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wraps any child component tree. If a child throws during render, instead of
// a white screen the user sees a friendly error card with the actual message.
//
// Usage in App.jsx:
//   import ErrorBoundary from './ErrorBoundary';
//   <Route path="/moderation" element={<ErrorBoundary><ContentModeration /></ErrorBoundary>} />
//
// Or wrap the whole <Routes> block once:
//   <ErrorBoundary><Routes>...</Routes></ErrorBoundary>
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary caught]', error, info);
    this.setState({ info });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F1512',
        padding: '24px',
        fontFamily: 'sans-serif',
      }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          backgroundColor: '#161D19',
          border: '1px solid rgba(255,80,80,0.2)',
          borderRadius: '20px',
          padding: '32px',
        }}>
          {/* Icon */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            backgroundColor: 'rgba(255,80,80,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <svg width="26" height="26" fill="none" stroke="#ef4444" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 style={{ color: '#E8F0E5', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#627A5C', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
            A component crashed. This is usually caused by a missing package,
            a bad import, or an unhandled error. Check the browser console for details.
          </p>

          {/* Error message */}
          {this.state.error && (
            <div style={{
              backgroundColor: '#0F1512',
              border: '1px solid rgba(255,80,80,0.15)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              overflowX: 'auto',
            }}>
              <p style={{ color: '#ef4444', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
                {this.state.error.toString()}
              </p>
            </div>
          )}

          <button
            onClick={() => this.setState({ hasError: false, error: null, info: null })}
            style={{
              backgroundColor: '#52B788',
              color: '#0F1512',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              backgroundColor: 'transparent',
              color: '#627A5C',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }
}
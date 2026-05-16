import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error'),
    info:    (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
      alignItems: 'center', pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const colors = {
          success: { bg: '#0f1f14', border: '#2d6a4f', color: '#6ee7b7' },
          error:   { bg: '#1f0f0f', border: '#7f1d1d', color: '#fca5a5' },
          info:    { bg: '#111814', border: '#2a3c30', color: '#9ca3af' },
        }[t.type] || { bg: '#111814', border: '#2a3c30', color: '#9ca3af' };

        const iconPath = {
          success: 'M5 13l4 4L19 7',
          error:   'M6 18L18 6M6 6l12 12',
          info:    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        }[t.type];

        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 12,
            border: `1px solid ${colors.border}`,
            background: colors.bg, color: colors.color,
            fontSize: 13, fontWeight: 500,
            pointerEvents: 'auto',
            fontFamily: 'system-ui, sans-serif',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor"
              strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
            </svg>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
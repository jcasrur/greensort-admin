import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const handleClose = (result) => {
    if (dialog?.resolve) dialog.resolve(result);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmDialog dialog={dialog} onClose={handleClose} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

function ConfirmDialog({ dialog, onClose }) {
  const { title, message, confirmLabel = 'Confirm', confirmStyle = 'primary' } = dialog;

  const confirmColor = confirmStyle === 'danger'
    ? { bg: '#dc2626', hover: '#b91c1c', text: '#fff' }
    : { bg: '#2d6a4f', hover: '#1e4d39', text: '#fff' };

  return (
    <div
      onClick={() => onClose(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 5000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          background: '#141a16',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Body */}
        <div style={{ padding: '24px 24px 20px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#dde8da' }}>
            {title}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#5e7a67', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div style={{ padding: '0 24px 22px', display: 'flex', gap: 10 }}>
          <button
            onClick={() => onClose(false)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent', color: '#5e7a67',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={() => onClose(true)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              border: 'none',
              background: confirmColor.bg, color: confirmColor.text,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = confirmColor.hover}
            onMouseLeave={e => e.currentTarget.style.background = confirmColor.bg}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

/* ─── CSS injected once ────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  .gs-login-root * { box-sizing: border-box; }

  /* Page fade-in */
  @keyframes gs-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .gs-animate { animation: gs-fade-up 0.55s cubic-bezier(.22,1,.36,1) both; }
  .gs-delay-1 { animation-delay: 0.08s; }
  .gs-delay-2 { animation-delay: 0.16s; }
  .gs-delay-3 { animation-delay: 0.24s; }
  .gs-delay-4 { animation-delay: 0.32s; }
  .gs-delay-5 { animation-delay: 0.40s; }

  /* Hex grid drift */
  @keyframes gs-drift {
    0%   { transform: translateY(0)   rotate(0deg);   opacity: .18; }
    50%  { transform: translateY(-18px) rotate(3deg); opacity: .28; }
    100% { transform: translateY(0)   rotate(0deg);   opacity: .18; }
  }
  .gs-hex { animation: gs-drift 9s ease-in-out infinite; }
  .gs-hex:nth-child(2) { animation-delay: -3s; }
  .gs-hex:nth-child(3) { animation-delay: -6s; }
  .gs-hex:nth-child(4) { animation-delay: -1.5s; }
  .gs-hex:nth-child(5) { animation-delay: -4.5s; }
  .gs-hex:nth-child(6) { animation-delay: -7.5s; }

  /* Logo pulse */
  @keyframes gs-pulse-glow {
    0%, 100% { filter: drop-shadow(0 0 12px rgba(52,211,153,.5)); }
    50%       { filter: drop-shadow(0 0 28px rgba(52,211,153,.9)); }
  }
  .gs-logo-glow { animation: gs-pulse-glow 3s ease-in-out infinite; }

  /* Input focus ring */
  .gs-input {
    width: 100%;
    background: #0D1614;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 12px;
    padding: 13px 16px;
    color: #e2ebe5;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    transition: border-color .2s, box-shadow .2s;
    outline: none;
  }
  .gs-input::placeholder { color: #3a5046; }
  .gs-input:focus {
    border-color: rgba(52,211,153,.45);
    box-shadow: 0 0 0 3px rgba(52,211,153,.08);
  }

  /* Submit button shimmer */
  @keyframes gs-shimmer {
    from { background-position: -200% center; }
    to   { background-position:  200% center; }
  }
  .gs-btn-primary {
    background: linear-gradient(90deg, #16a34a, #34d399, #16a34a);
    background-size: 200% auto;
    transition: background-position .5s, transform .15s, box-shadow .2s;
  }
  .gs-btn-primary:hover {
    background-position: right center;
    box-shadow: 0 0 28px rgba(52,211,153,.4);
  }
  .gs-btn-primary:active { transform: scale(.97); }

  /* Scrollbar hide */
  .gs-login-root::-webkit-scrollbar { display: none; }

  /* Diagonal clip on left panel */
  @media (min-width: 1024px) {
    .gs-left-panel::after {
      content: '';
      position: absolute;
      right: -1px; top: 0; bottom: 0; width: 60px;
      background: #080F0C;
      clip-path: polygon(100% 0, 100% 100%, 0 100%);
    }
  }

  /* Stat pill */
  .gs-stat-pill {
    background: rgba(52,211,153,.07);
    border: 1px solid rgba(52,211,153,.15);
    border-radius: 50px;
    padding: 6px 14px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: rgba(52,211,153,.75);
    font-family: 'DM Sans', sans-serif;
    letter-spacing: .04em;
  }

  /* Checkbox custom */
  .gs-checkbox {
    appearance: none;
    width: 16px; height: 16px;
    border: 1.5px solid rgba(255,255,255,.15);
    border-radius: 4px;
    background: #0D1614;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    transition: border-color .2s, background .2s;
  }
  .gs-checkbox:checked {
    background: #16a34a;
    border-color: #16a34a;
  }
  .gs-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 3px; top: 1px;
    width: 8px; height: 5px;
    border-left: 2px solid white;
    border-bottom: 2px solid white;
    transform: rotate(-45deg);
  }
`;

/* ─── Hex path helper ───────────────────────────────────────────────────────── */
const HEX = ({ x, y, r, op = 0.2, cls = '' }) => {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
  }).join(' ');
  return <polygon className={`gs-hex ${cls}`} points={pts} fill="none" stroke="rgba(52,211,153,1)" strokeWidth="1" opacity={op} />;
};

/* ─── Main component ────────────────────────────────────────────────────────── */
const AdminLogin = () => {
  const navigate = useNavigate();
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');
  const [capsLockOn,   setCapsLockOn]   = useState(false);

  const handleKeyUp = (e) => setCapsLockOn(e.getModifierState('CapsLock'));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (authError) {
        if (authError.message.includes('Invalid login'))       setError('Invalid email or password. Access Denied.');
        else if (authError.message.includes('Email not confirmed')) setError('Email not confirmed. Check your inbox or ask a Super Admin.');
        else setError(authError.message);
        return;
      }
      const { data: adminRow, error: dbError } = await supabase
        .from('admin_users').select('role, is_active, full_name')
        .eq('email', authData.user.email).single();
      if (dbError || !adminRow) {
        await supabase.auth.signOut();
        setError('This account does not have admin portal access.');
        return;
      }
      if (!adminRow.is_active) {
        await supabase.auth.signOut();
        setError('Your admin account has been deactivated. Contact a Super Admin.');
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{STYLES}</style>

      <div
        className="gs-login-root"
        style={{
          minHeight: '100vh',
          display: 'flex',
          background: '#080F0C',
          fontFamily: "'DM Sans', sans-serif",
          overflow: 'hidden',
        }}
      >

        {/* ══════════════════════════════════════════════════════════════
            LEFT PANEL — brand / atmosphere
        ══════════════════════════════════════════════════════════════ */}
        <div
          className="gs-left-panel"
          style={{
            display: 'none',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(145deg, #0A1F14 0%, #061209 50%, #030D07 100%)',
            flex: '0 0 52%',
          }}
        >
          {/* Hex grid SVG */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice"
          >
            {/* Row 1 */}
            <HEX x={80}  y={100} r={55} op={0.12} />
            <HEX x={190} y={100} r={55} op={0.18} />
            <HEX x={300} y={100} r={55} op={0.10} />
            <HEX x={410} y={100} r={55} op={0.15} />
            <HEX x={520} y={100} r={55} op={0.08} />
            {/* Row 2 — offset */}
            <HEX x={135} y={195} r={55} op={0.22} />
            <HEX x={245} y={195} r={55} op={0.14} />
            <HEX x={355} y={195} r={55} op={0.20} />
            <HEX x={465} y={195} r={55} op={0.11} />
            {/* Row 3 */}
            <HEX x={80}  y={290} r={55} op={0.16} />
            <HEX x={190} y={290} r={55} op={0.24} />
            <HEX x={300} y={290} r={55} op={0.13} />
            <HEX x={410} y={290} r={55} op={0.19} />
            <HEX x={520} y={290} r={55} op={0.09} />
            {/* Row 4 */}
            <HEX x={135} y={385} r={55} op={0.17} />
            <HEX x={245} y={385} r={55} op={0.21} />
            <HEX x={355} y={385} r={55} op={0.12} />
            <HEX x={465} y={385} r={55} op={0.16} />
            {/* Row 5 */}
            <HEX x={80}  y={480} r={55} op={0.11} />
            <HEX x={190} y={480} r={55} op={0.18} />
            <HEX x={300} y={480} r={55} op={0.23} />
            <HEX x={410} y={480} r={55} op={0.14} />
            <HEX x={520} y={480} r={55} op={0.10} />
            {/* Row 6 */}
            <HEX x={135} y={575} r={55} op={0.20} />
            <HEX x={245} y={575} r={55} op={0.13} />
            <HEX x={355} y={575} r={55} op={0.17} />
            <HEX x={465} y={575} r={55} op={0.22} />
            {/* Row 7 */}
            <HEX x={80}  y={670} r={55} op={0.14} />
            <HEX x={190} y={670} r={55} op={0.20} />
            <HEX x={300} y={670} r={55} op={0.11} />
            <HEX x={410} y={670} r={55} op={0.17} />
            <HEX x={520} y={670} r={55} op={0.09} />
            {/* Large accent hexagons */}
            <HEX x={300} y={400} r={180} op={0.04} />
            <HEX x={300} y={400} r={240} op={0.025} />
          </svg>

          {/* Radial glow center */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 60% 55% at 45% 50%, rgba(22,163,74,.12) 0%, transparent 70%)',
          }} />

          {/* Content */}
          <div style={{
            position: 'relative', zIndex: 10,
            display: 'flex', flexDirection: 'column',
            height: '100%', padding: '56px 52px',
          }}>

            {/* Logo mark */}
            <div className="gs-animate gs-delay-1" style={{ marginBottom: 'auto' }}>
              <div className="gs-logo-glow" style={{ width: 56, height: 56, marginBottom: 20 }}>
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 15 C 65 15, 80 30, 80 50 C 80 50, 65 40, 50 40 C 35 40, 20 50, 20 50 C 20 30, 35 15, 50 15 Z" fill="#34d399" opacity="0.95"/>
                  <path d="M80 50 C 80 70, 65 85, 50 85 C 50 85, 55 70, 45 60 C 35 50, 20 50, 20 50 C 35 65, 55 75, 80 50 Z" fill="#6ee7b7" opacity="0.9"/>
                  <path d="M20 50 C 20 70, 35 85, 50 85 C 50 85, 45 70, 55 60 C 65 50, 80 50, 80 50 C 65 65, 45 75, 20 50 Z" fill="#a7f3d0" opacity="0.85"/>
                </svg>
              </div>
              <div style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 44, fontWeight: 400, letterSpacing: '-0.5px',
                lineHeight: 1.1, marginBottom: 16,
              }}>
                <span style={{ color: '#e2ebe5' }}>Green</span>
                <span style={{ color: '#34d399' }}>Sort</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(162,218,189,.55)', lineHeight: 1.7, maxWidth: 320, fontWeight: 300 }}>
                Waste intelligence platform for a cleaner tomorrow. Manage your recycling network from one secure place.
              </p>
            </div>

            {/* Middle stat pills */}
            <div className="gs-animate gs-delay-2" style={{ margin: '48px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="gs-stat-pill">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                Real-time network monitoring
              </div>
              <div className="gs-stat-pill">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                AI-powered content moderation
              </div>
              <div className="gs-stat-pill">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                Full audit trail & log management
              </div>
            </div>

            {/* Bottom label */}
            <div className="gs-animate gs-delay-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" fill="none" stroke="#34d399" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(52,211,153,.6)', letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>Restricted Area</p>
                <p style={{ fontSize: 10, color: 'rgba(162,218,189,.3)', margin: 0 }}>Authorized Personnel Only</p>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT PANEL — form
        ══════════════════════════════════════════════════════════════ */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          background: '#080F0C',
          position: 'relative',
        }}>

          {/* Subtle top-right ambient */}
          <div style={{
            position: 'absolute', top: -80, right: -80,
            width: 360, height: 360,
            background: 'radial-gradient(circle, rgba(22,163,74,.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -60, left: -60,
            width: 280, height: 280,
            background: 'radial-gradient(circle, rgba(52,211,153,.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

            {/* Mobile-only logo */}
            <div className="gs-animate gs-delay-1" style={{ textAlign: 'center', marginBottom: 36 }}>
              <div className="gs-logo-glow" style={{ width: 44, height: 44, margin: '0 auto 12px' }}>
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 15 C 65 15, 80 30, 80 50 C 80 50, 65 40, 50 40 C 35 40, 20 50, 20 50 C 20 30, 35 15, 50 15 Z" fill="#34d399"/>
                  <path d="M80 50 C 80 70, 65 85, 50 85 C 50 85, 55 70, 45 60 C 35 50, 20 50, 20 50 C 35 65, 55 75, 80 50 Z" fill="#6ee7b7"/>
                  <path d="M20 50 C 20 70, 35 85, 50 85 C 50 85, 45 70, 55 60 C 65 50, 80 50, 80 50 C 65 65, 45 75, 20 50 Z" fill="#a7f3d0"/>
                </svg>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(52,211,153,.5)', letterSpacing: '.2em', textTransform: 'uppercase', margin: 0 }}>
                GreenSort Admin
              </p>
            </div>

            {/* Heading */}
            <div className="gs-animate gs-delay-1" style={{ marginBottom: 32 }}>
              <h2 style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 30, fontWeight: 400,
                color: '#e2ebe5', margin: '0 0 6px',
                letterSpacing: '-.3px', lineHeight: 1.2,
              }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(162,218,189,.45)', margin: 0, fontWeight: 300 }}>
                Sign in to your admin account to continue.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="gs-animate" style={{
                marginBottom: 20,
                padding: '11px 14px',
                background: 'rgba(239,68,68,.08)',
                border: '1px solid rgba(239,68,68,.25)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <svg width="15" height="15" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span style={{ fontSize: 13, color: '#f87171', fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin}>

              {/* Email */}
              <div className="gs-animate gs-delay-2" style={{ marginBottom: 18 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600,
                  color: 'rgba(52,211,153,.7)', letterSpacing: '.1em',
                  textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Email
                </label>
                <input
                  className="gs-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@greensort.app"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="gs-animate gs-delay-3" style={{ marginBottom: 22 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600,
                  color: 'rgba(52,211,153,.7)', letterSpacing: '.1em',
                  textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="gs-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyUp={handleKeyUp}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ paddingRight: 46 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: 'rgba(162,218,189,.35)', transition: 'color .2s',
                      display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#34d399'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(162,218,189,.35)'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      </svg>
                    )}
                  </button>
                </div>

                {/* Caps lock warning */}
                {capsLockOn && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <svg width="12" height="12" fill="none" stroke="#fbbf24" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <span style={{ fontSize: 11, color: '#fbbf24' }}>Caps Lock is ON</span>
                  </div>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="gs-animate gs-delay-3" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 28,
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" className="gs-checkbox" />
                  <span style={{ fontSize: 13, color: 'rgba(162,218,189,.4)', fontWeight: 400 }}>Remember me</span>
                </label>
                <a href="#" style={{
                  fontSize: 12, color: 'rgba(52,211,153,.5)',
                  textDecoration: 'none', fontWeight: 500,
                  transition: 'color .2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#34d399'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(52,211,153,.5)'}
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <div className="gs-animate gs-delay-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="gs-btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    borderRadius: 12,
                    border: 'none',
                    color: '#052e16',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {isLoading ? (
                    <>
                      {/* Spinner */}
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#052e16" strokeWidth="2.5"
                        style={{ animation: 'spin 0.8s linear infinite' }}
                      >
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Authenticating…
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg width="15" height="15" fill="none" stroke="#052e16" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="gs-animate gs-delay-5" style={{
              marginTop: 36, paddingTop: 24,
              borderTop: '1px solid rgba(255,255,255,.04)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, color: 'rgba(162,218,189,.2)', letterSpacing: '.12em', textTransform: 'uppercase', margin: 0 }}>
                GreenSort Admin Portal · v2.0
              </p>
            </div>

          </div>
        </div>

        {/* ── Responsive: show left panel on lg+ ── */}
        <style>{`
          @media (min-width: 1024px) {
            .gs-left-panel { display: flex !important; flex-direction: column; }
          }
          @media (max-width: 1023px) {
            .gs-logo-glow:first-of-type ~ * { display: none; }
          }
        `}</style>
      </div>
    </>
  );
};

export default AdminLogin;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  .mfa-root * { box-sizing: border-box; }

  @keyframes mfa-fade-up {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .mfa-anim  { animation: mfa-fade-up 0.5s cubic-bezier(.22,1,.36,1) both; }
  .mfa-d1 { animation-delay:.05s; }
  .mfa-d2 { animation-delay:.12s; }
  .mfa-d3 { animation-delay:.19s; }
  .mfa-d4 { animation-delay:.26s; }
  .mfa-d5 { animation-delay:.33s; }

  @keyframes mfa-spin { to { transform: rotate(360deg); } }
  .mfa-spinner { animation: mfa-spin 0.8s linear infinite; }

  @keyframes mfa-pulse-border {
    0%,100% { border-color: rgba(52,211,153,.25); box-shadow: 0 0 0 0 rgba(52,211,153,0); }
    50%      { border-color: rgba(52,211,153,.55); box-shadow: 0 0 0 6px rgba(52,211,153,.06); }
  }
  .mfa-qr-frame { animation: mfa-pulse-border 2.5s ease-in-out infinite; }

  @keyframes mfa-shake {
    0%,100% { transform:translateX(0); }
    20%     { transform:translateX(-5px); }
    40%     { transform:translateX(5px); }
    60%     { transform:translateX(-3px); }
    80%     { transform:translateX(3px); }
  }
  .mfa-shake { animation: mfa-shake 0.38s ease; }

  /* Step progress bar */
  @keyframes mfa-bar-grow {
    from { width: 0; }
    to   { width: 100%; }
  }

  .mfa-input {
    width: 100%;
    background: #0D1614;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 12px;
    padding: 13px 16px;
    color: #e2ebe5;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .mfa-input::placeholder { color: #2e4a3c; }
  .mfa-input:focus {
    border-color: rgba(52,211,153,.45);
    box-shadow: 0 0 0 3px rgba(52,211,153,.08);
  }

  /* OTP boxes */
  .mfa-otp {
    width: 48px; height: 56px;
    background: #0D1614;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 11px;
    color: #e2ebe5;
    font-size: 22px; font-weight: 600;
    text-align: center;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color .18s, box-shadow .18s, background .18s;
    caret-color: #34d399;
  }
  .mfa-otp:focus {
    border-color: rgba(52,211,153,.5);
    box-shadow: 0 0 0 3px rgba(52,211,153,.09);
  }
  .mfa-otp.filled {
    border-color: rgba(52,211,153,.28);
    background: rgba(52,211,153,.04);
  }
  .mfa-otp.err {
    border-color: rgba(239,68,68,.5) !important;
    background: rgba(239,68,68,.04) !important;
    box-shadow: 0 0 0 3px rgba(239,68,68,.07) !important;
  }

  .mfa-btn {
    width: 100%; padding: 13px 20px; border-radius: 12px; border: none;
    background: linear-gradient(90deg, #16a34a, #34d399, #16a34a);
    background-size: 200% auto;
    color: #052e16; font-size: 13px; font-weight: 700;
    letter-spacing: .07em; text-transform: uppercase;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px;
    transition: background-position .45s, transform .12s, box-shadow .2s;
  }
  .mfa-btn:hover:not(:disabled) {
    background-position: right center;
    box-shadow: 0 0 24px rgba(52,211,153,.35);
  }
  .mfa-btn:active:not(:disabled) { transform: scale(.97); }
  .mfa-btn:disabled { opacity: .45; cursor: not-allowed; }

  .mfa-ghost-btn {
    background: rgba(52,211,153,.05);
    border: 1px solid rgba(52,211,153,.15);
    border-radius: 10px; padding: 10px 18px;
    color: rgba(52,211,153,.65); font-size: 12px; font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
    transition: background .18s, border-color .18s, color .18s;
  }
  .mfa-ghost-btn:hover { background: rgba(52,211,153,.1); border-color: rgba(52,211,153,.3); color: #34d399; }

  .mfa-copy-btn {
    background: rgba(52,211,153,.07);
    border: 1px solid rgba(52,211,153,.18);
    border-radius: 8px; padding: 6px 12px;
    color: rgba(52,211,153,.6); font-size: 11px; font-weight: 500;
    font-family: 'DM Sans', sans-serif; cursor: pointer;
    transition: all .18s; white-space: nowrap;
  }
  .mfa-copy-btn:hover { background: rgba(52,211,153,.14); color: #34d399; }

  .mfa-step-pill {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(52,211,153,.07); border: 1px solid rgba(52,211,153,.15);
    border-radius: 50px; padding: 4px 12px;
    font-size: 10px; color: rgba(52,211,153,.65);
    font-family: 'DM Sans', sans-serif; letter-spacing: .08em; text-transform: uppercase;
  }

  .mfa-secret-box {
    background: #0A1410;
    border: 1px solid rgba(52,211,153,.1);
    border-radius: 10px;
    padding: 10px 14px;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    font-family: 'Courier New', monospace;
    font-size: 13px; letter-spacing: .12em;
    color: rgba(52,211,153,.7);
    word-break: break-all;
  }

  .mfa-numbered-step {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 12px 0;
  }
  .mfa-step-num {
    width: 22px; height: 22px; border-radius: 50%;
    background: rgba(52,211,153,.1); border: 1px solid rgba(52,211,153,.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; color: #34d399;
    flex-shrink: 0; margin-top: 1px;
    font-family: 'DM Sans', sans-serif;
  }

  @keyframes mfa-check-pop {
    0%   { transform: scale(0) rotate(-15deg); opacity:0; }
    70%  { transform: scale(1.15) rotate(3deg); }
    100% { transform: scale(1) rotate(0deg); opacity:1; }
  }
  .mfa-success-icon { animation: mfa-check-pop 0.45s cubic-bezier(.22,1,.36,1) both; }

  /* Hex bg */
  @keyframes mfa-drift {
    0%,100% { transform:translateY(0) rotate(0); opacity:.14; }
    50%     { transform:translateY(-14px) rotate(2deg); opacity:.22; }
  }
  .mfa-hex-g { animation: mfa-drift 10s ease-in-out infinite; }
  .mfa-hex-g:nth-child(2) { animation-delay:-3.5s; }
  .mfa-hex-g:nth-child(3) { animation-delay:-7s; }
`;

/* ─── Hex helper ─────────────────────────────────────────────────────────── */
const HexBg = () => {
  const hexes = [
    [80,80,60,.1],[220,60,45,.08],[360,100,55,.06],[500,50,40,.09],
    [140,200,50,.07],[320,220,65,.05],[480,180,42,.08],
    [60,320,48,.06],[200,340,60,.09],[380,300,44,.07],[540,350,52,.05],
  ];
  return (
    <svg style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',overflow:'hidden' }}
      viewBox="0 0 600 500" preserveAspectRatio="xMidYMid slice">
      {hexes.map(([x,y,r,op],i) => {
        const pts = Array.from({length:6},(_,j)=>{
          const a=(Math.PI/180)*(60*j-30);
          return `${x+r*Math.cos(a)},${y+r*Math.sin(a)}`;
        }).join(' ');
        return <polygon key={i} className="mfa-hex-g" points={pts} fill="none"
          stroke="rgba(52,211,153,1)" strokeWidth="1" opacity={op}
          style={{ animationDelay:`${-i*1.3}s` }} />;
      })}
    </svg>
  );
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function MFAEnrollment() {
  const navigate = useNavigate();

  const STEPS = { LOADING:'loading', SETUP:'setup', VERIFY:'verify', SUCCESS:'success' };
  const [phase,      setPhase]      = useState(STEPS.LOADING);
  const [qrCode,     setQrCode]     = useState('');   // raw SVG string from Supabase
  const [secret,     setSecret]     = useState('');
  const [factorId,   setFactorId]   = useState('');
  const [digits,     setDigits]     = useState(['','','','','','']);
  const [verifying,  setVerifying]  = useState(false);
  const [error,      setError]      = useState('');
  const [shake,      setShake]      = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [initError,  setInitError]  = useState('');

  /* ── On mount: start enrollment ── */
  useEffect(() => {
    startEnrollment();
  }, []);

  const startEnrollment = async () => {
    setPhase(STEPS.LOADING);
    setInitError('');
    try {
      // ── Guard: must have an active Supabase session ──
      // The MFA endpoints require a Bearer token (the user's access token).
      // If there's no session, the user hasn't completed Step 1 login yet.
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) {
        setInitError('You must sign in first before setting up Google Authenticator. Please go back to the login page.');
        setPhase(STEPS.SETUP);
        return;
      }

      // List ALL factors regardless of status
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const allTotp = factors?.totp || [];

      // If already verified — done, skip to success
      const verified = allTotp.find(f => f.status === 'verified');
      if (verified) {
        setPhase(STEPS.SUCCESS);
        return;
      }

      // Unenroll every existing factor (pending/unverified) for a clean slate
      for (const f of allTotp) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      // Try to enroll. If we still hit the "already exists" error,
      // it means Supabase has a hidden factor — use the Supabase dashboard
      // to manually unenroll, then retry.
      let enrollData;
      const { data: d1, error: e1 } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'GreenSort Admin',
      });
      if (e1) {
        // If still "already exists", try a differently-named factor as fallback
        if (e1.message?.includes('already exists')) {
          const { data: d2, error: e2 } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: `GreenSort-${Date.now()}`,
          });
          if (e2) throw e2;
          enrollData = d2;
        } else {
          throw e1;
        }
      } else {
        enrollData = d1;
      }

      setFactorId(enrollData.id);
      setSecret(enrollData.totp.secret);
      // qr_code from Supabase is a data:image/svg+xml URI — use directly in <img>
      setQrCode(enrollData.totp.qr_code);
      setPhase(STEPS.SETUP);
    } catch (err) {
      console.error('Enrollment error:', err);
      setInitError(err.message || 'Failed to start enrollment. Please refresh.');
      setPhase(STEPS.SETUP); // show error state in setup phase
    }
  };

  /* ── Copy secret ── */
  const copySecret = async () => {
    try { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(()=>setCopied(false),2000); }
    catch { /* fallback: select text */ }
  };

  /* ── OTP input ── */
  const handleDigit = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits]; next[i] = val.slice(-1);
    setDigits(next); setError('');
    if (val && i < 5) document.getElementById(`mfa-d-${i+1}`)?.focus();
    if (val && i === 5 && next.every(d => d !== '')) setTimeout(() => verify(next.join('')), 80);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) document.getElementById(`mfa-d-${i-1}`)?.focus();
    if (e.key === 'Enter' && digits.every(d=>d!=='')) verify(digits.join(''));
  };

  const handlePaste = e => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (!p) return;
    const next = Array(6).fill('');
    p.split('').forEach((c,i)=>{ next[i]=c; });
    setDigits(next);
    document.getElementById(`mfa-d-${Math.min(p.length,5)}`)?.focus();
    if (p.length===6) setTimeout(()=>verify(p),80);
  };

  /* ── Verify TOTP ── */
  const verify = async (code) => {
    setVerifying(true); setError('');
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId, challengeId: challenge.id, code,
      });
      if (vErr) {
        setShake(true); setTimeout(()=>setShake(false),420);
        setDigits(['','','','','','']);
        setTimeout(()=>document.getElementById('mfa-d-0')?.focus(),50);
        setError('Wrong code — check the app and try again.');
        return;
      }
      setPhase(STEPS.SUCCESS);
    } catch (err) {
      setShake(true); setTimeout(()=>setShake(false),420);
      setError(err.message || 'Verification failed.');
    } finally { setVerifying(false); }
  };

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <>
      <style>{STYLES}</style>
      <div className="mfa-root" style={{
        minHeight:'100vh', background:'#080F0C',
        fontFamily:"'DM Sans', sans-serif",
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'32px 20px', position:'relative', overflow:'hidden',
      }}>
        <HexBg />
        {/* Ambient glows */}
        <div style={{ position:'absolute',top:-100,right:-60,width:380,height:380,
          background:'radial-gradient(circle, rgba(22,163,74,.08) 0%, transparent 68%)',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',bottom:-80,left:-40,width:300,height:300,
          background:'radial-gradient(circle, rgba(52,211,153,.05) 0%, transparent 68%)',pointerEvents:'none' }}/>

        <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:10 }}>

          {/* ── Logo ── */}
          <div className="mfa-anim mfa-d1" style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ width:40,height:40,margin:'0 auto 10px',
              filter:'drop-shadow(0 0 12px rgba(52,211,153,.45))' }}>
              <svg viewBox="0 0 100 100" fill="none">
                <path d="M50 15 C 65 15, 80 30, 80 50 C 80 50, 65 40, 50 40 C 35 40, 20 50, 20 50 C 20 30, 35 15, 50 15 Z" fill="#34d399"/>
                <path d="M80 50 C 80 70, 65 85, 50 85 C 50 85, 55 70, 45 60 C 35 50, 20 50, 20 50 C 35 65, 55 75, 80 50 Z" fill="#6ee7b7"/>
                <path d="M20 50 C 20 70, 35 85, 50 85 C 50 85, 45 70, 55 60 C 65 50, 80 50, 80 50 C 65 65, 45 75, 20 50 Z" fill="#a7f3d0"/>
              </svg>
            </div>
            <p style={{ fontSize:10,color:'rgba(52,211,153,.4)',letterSpacing:'.22em',
              textTransform:'uppercase',margin:0 }}>GreenSort Admin</p>
          </div>

          {/* ════════ LOADING ════════ */}
          {phase === STEPS.LOADING && (
            <div className="mfa-anim" style={{ textAlign:'center', padding:'40px 0' }}>
              <svg className="mfa-spinner" width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#34d399" strokeWidth="2.5" style={{ margin:'0 auto 16px',display:'block' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <p style={{ fontSize:13,color:'rgba(162,218,189,.4)',margin:0 }}>Setting up authenticator…</p>
            </div>
          )}

          {/* ════════ SETUP: QR CODE ════════ */}
          {phase === STEPS.SETUP && (
            <div style={{
              background:'rgba(13,22,18,.7)',
              border:'1px solid rgba(52,211,153,.1)',
              borderRadius:20,
              backdropFilter:'blur(12px)',
              overflow:'hidden',
            }}>
              {/* Card header */}
              <div style={{ padding:'24px 28px 20px',
                borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                <div className="mfa-anim mfa-d1" style={{ display:'flex',alignItems:'center',gap:12,marginBottom:10 }}>
                  <div style={{ width:40,height:40,borderRadius:11,
                    background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.18)',
                    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                    <svg width="20" height="20" fill="none" stroke="#34d399" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 style={{ fontFamily:"'DM Serif Display', serif",fontSize:20,fontWeight:400,
                      color:'#e2ebe5',margin:0,lineHeight:1.2 }}>Set up Google Authenticator</h2>
                    <p style={{ fontSize:12,color:'rgba(162,218,189,.4)',margin:'3px 0 0',fontWeight:300 }}>
                      One-time setup · takes about 60 seconds
                    </p>
                  </div>
                </div>
              </div>

              {/* Init error */}
              {initError && (
                <div style={{ margin:'16px 28px 0',padding:'14px 16px',
                  background:'rgba(239,68,68,.07)',border:'1px solid rgba(239,68,68,.2)',borderRadius:12 }}>
                  <div style={{ display:'flex',alignItems:'flex-start',gap:9,marginBottom: initError.includes('sign in') ? 12 : 0 }}>
                    <svg width="15" height="15" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0,marginTop:1 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span style={{ fontSize:13,color:'#f87171',lineHeight:1.5 }}>{initError}</span>
                  </div>
                  {initError.includes('sign in') && (
                    <button className="mfa-btn" onClick={() => navigate('/')}
                      style={{ marginTop:4 }}>
                      ← Go to Login
                    </button>
                  )}
                </div>
              )}

              <div style={{ padding:'20px 28px 28px' }}>

                {/* Numbered steps */}
                <div className="mfa-anim mfa-d2" style={{ marginBottom:20 }}>
                  {[
                    { n:'1', text:'Install Google Authenticator on your phone', sub:'Available on iOS App Store and Android Google Play' },
                    { n:'2', text:'Open the app and tap the + button', sub:'Then select "Scan a QR code"' },
                    { n:'3', text:'Point your camera at the QR code below', sub:'The account will be added automatically' },
                  ].map(({ n, text, sub }) => (
                    <div key={n} className="mfa-numbered-step" style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                      <div className="mfa-step-num">{n}</div>
                      <div>
                        <p style={{ fontSize:13,color:'#c8ddd0',margin:0,fontWeight:500 }}>{text}</p>
                        <p style={{ fontSize:11,color:'rgba(162,218,189,.35)',margin:'3px 0 0',fontWeight:300 }}>{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* QR Code */}
                <div className="mfa-anim mfa-d3" style={{ display:'flex',justifyContent:'center',marginBottom:20 }}>
                  {qrCode ? (
                    <div className="mfa-qr-frame" style={{
                      padding:16, borderRadius:16,
                      background:'#fff',
                      border:'2px solid rgba(52,211,153,.25)',
                      display:'inline-flex', position:'relative',
                    }}>
                      {/* Corner accents */}
                      {[
                        {top:4,left:4,borderTop:'2px solid #34d399',borderLeft:'2px solid #34d399'},
                        {top:4,right:4,borderTop:'2px solid #34d399',borderRight:'2px solid #34d399'},
                        {bottom:4,left:4,borderBottom:'2px solid #34d399',borderLeft:'2px solid #34d399'},
                        {bottom:4,right:4,borderBottom:'2px solid #34d399',borderRight:'2px solid #34d399'},
                      ].map((style,i) => (
                        <div key={i} style={{ position:'absolute',width:14,height:14,borderRadius:2,...style }} />
                      ))}
                      <img
                        src={qrCode}
                        alt="QR Code"
                        style={{ width:180, height:180, display:'block' }}
                        onError={(e) => {
                          // If data URI fails, try rendering as inline SVG
                          const parent = e.target.parentNode;
                          const div = document.createElement('div');
                          div.innerHTML = atob(qrCode.split(',')[1] || '');
                          div.style.cssText = 'width:180px;height:180px';
                          parent.replaceChild(div, e.target);
                        }}
                      />
                    </div>
                  ) : (
                    /* Skeleton while QR loads */
                    <div style={{ width:212,height:212,borderRadius:16,
                      background:'rgba(52,211,153,.04)',border:'1px solid rgba(52,211,153,.1)',
                      display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <svg className="mfa-spinner" width="24" height="24" viewBox="0 0 24 24"
                        fill="none" stroke="#34d399" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Manual secret */}
                <div className="mfa-anim mfa-d3" style={{ marginBottom:24 }}>
                  <p style={{ fontSize:11,color:'rgba(162,218,189,.3)',margin:'0 0 8px',
                    display:'flex',alignItems:'center',gap:6 }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Can't scan? Enter this code manually in the app instead:
                  </p>
                  <div className="mfa-secret-box">
                    <span style={{ flex:1 }}>{secret || '—'}</span>
                    <button className="mfa-copy-btn" onClick={copySecret}>
                      {copied ? (
                        <span style={{ color:'#34d399' }}>✓ Copied</span>
                      ) : (
                        <>
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ display:'inline',verticalAlign:'middle',marginRight:4 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Continue button */}
                <div className="mfa-anim mfa-d4">
                  <button className="mfa-btn" onClick={() => { setPhase(STEPS.VERIFY); setTimeout(()=>document.getElementById('mfa-d-0')?.focus(),100); }}
                    disabled={!qrCode}>
                    I've scanned the QR code →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════ VERIFY: Enter code ════════ */}
          {phase === STEPS.VERIFY && (
            <div style={{
              background:'rgba(13,22,18,.7)',
              border:'1px solid rgba(52,211,153,.1)',
              borderRadius:20,
              backdropFilter:'blur(12px)',
              padding:'28px',
            }}>
              {/* Header */}
              <div className="mfa-anim mfa-d1" style={{ marginBottom:24 }}>
                <button onClick={() => setPhase(STEPS.SETUP)} style={{
                  background:'none',border:'none',cursor:'pointer',padding:0,
                  fontSize:12,color:'rgba(52,211,153,.4)',fontFamily:"'DM Sans', sans-serif",
                  display:'flex',alignItems:'center',gap:5,marginBottom:16,
                  transition:'color .18s' }}
                  onMouseEnter={e=>e.currentTarget.style.color='rgba(52,211,153,.7)'}
                  onMouseLeave={e=>e.currentTarget.style.color='rgba(52,211,153,.4)'}>
                  ← Back to QR code
                </button>

                <div style={{ width:48,height:48,borderRadius:13,
                  background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.2)',
                  display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14 }}>
                  <svg width="24" height="24" fill="none" stroke="#34d399" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
                <h2 style={{ fontFamily:"'DM Serif Display', serif",fontSize:22,fontWeight:400,
                  color:'#e2ebe5',margin:'0 0 6px',lineHeight:1.2 }}>Verify it's working</h2>
                <p style={{ fontSize:13,color:'rgba(162,218,189,.4)',margin:0,fontWeight:300,lineHeight:1.6 }}>
                  Open Google Authenticator, find <span style={{ color:'rgba(52,211,153,.65)' }}>GreenSort Admin</span>, and enter the 6-digit code shown.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mfa-anim" style={{ marginBottom:16,padding:'10px 14px',
                  background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.22)',borderRadius:11,
                  display:'flex',alignItems:'center',gap:9 }}>
                  <svg width="14" height="14" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span style={{ fontSize:12,color:'#f87171' }}>{error}</span>
                </div>
              )}

              {/* 6 digit boxes */}
              <div className="mfa-anim mfa-d2"
                style={{ display:'flex',gap:7,justifyContent:'center',marginBottom:8 }}
                onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input key={i} id={`mfa-d-${i}`}
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className={`mfa-otp${d?' filled':''}${error?' err':''}${shake?' mfa-shake':''}`}
                    autoFocus={i===0} autoComplete="one-time-code"
                  />
                ))}
              </div>
              <p style={{ fontSize:11,color:'rgba(162,218,189,.22)',textAlign:'center',margin:'8px 0 20px' }}>
                Codes refresh every 30 s · use the number currently shown
              </p>

              {/* Verify */}
              <div className="mfa-anim mfa-d3">
                <button className="mfa-btn"
                  onClick={() => verify(digits.join(''))}
                  disabled={verifying || digits.some(d=>d==='')}>
                  {verifying ? (
                    <>
                      <svg className="mfa-spinner" width="15" height="15" viewBox="0 0 24 24"
                        fill="none" stroke="#052e16" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Verifying…
                    </>
                  ) : 'Confirm & Finish Setup'}
                </button>
              </div>
            </div>
          )}

          {/* ════════ SUCCESS ════════ */}
          {phase === STEPS.SUCCESS && (
            <div style={{
              background:'rgba(13,22,18,.7)',
              border:'1px solid rgba(52,211,153,.18)',
              borderRadius:20,
              backdropFilter:'blur(12px)',
              padding:'40px 28px',
              textAlign:'center',
            }}>
              <div className="mfa-success-icon" style={{
                width:64,height:64,borderRadius:'50%',
                background:'rgba(52,211,153,.1)',border:'2px solid rgba(52,211,153,.3)',
                display:'flex',alignItems:'center',justifyContent:'center',
                margin:'0 auto 20px',
              }}>
                <svg width="30" height="30" fill="none" stroke="#34d399" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>

              <h2 style={{ fontFamily:"'DM Serif Display', serif",fontSize:26,fontWeight:400,
                color:'#e2ebe5',margin:'0 0 10px' }}>You're all set!</h2>
              <p style={{ fontSize:13,color:'rgba(162,218,189,.45)',margin:'0 0 28px',fontWeight:300,lineHeight:1.65 }}>
                Google Authenticator is now linked to your account.<br/>
                Every time you log in you'll be asked for a 6-digit code from the app.
              </p>

              {/* What to remember */}
              <div style={{ background:'rgba(52,211,153,.05)',border:'1px solid rgba(52,211,153,.1)',
                borderRadius:12,padding:'14px 18px',marginBottom:28,textAlign:'left' }}>
                {[
                  "Don't delete the GreenSort Admin entry from the app",
                  "If you lose your phone, contact a Super Admin to reset 2FA",
                  "Codes change every 30 seconds — always use the current one",
                ].map((tip,i) => (
                  <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:9,
                    padding:'6px 0',borderBottom:i<2?'1px solid rgba(255,255,255,.04)':'none' }}>
                    <svg width="12" height="12" fill="none" stroke="#34d399" strokeWidth="2" viewBox="0 0 24 24"
                      style={{ flexShrink:0,marginTop:2 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span style={{ fontSize:12,color:'rgba(162,218,189,.5)',lineHeight:1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>

              <button className="mfa-btn" onClick={() => navigate('/')}>
                Go to Login
                <svg width="14" height="14" fill="none" stroke="#052e16" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </button>
            </div>
          )}

          {/* Footer */}
          <p className="mfa-anim mfa-d5" style={{ textAlign:'center',fontSize:10,
            color:'rgba(162,218,189,.12)',letterSpacing:'.14em',textTransform:'uppercase',
            marginTop:24 }}>
            GreenSort Admin Portal · Secured by Supabase MFA
          </p>
        </div>
      </div>
    </>
  );
}
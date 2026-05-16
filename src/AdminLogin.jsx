import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import logo from './assets/logo.png'; // 1. IMPORTED LOGO HERE

/* ─── CSS injected once ────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  .gs-login-root * { box-sizing: border-box; }

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

  @keyframes gs-pulse-glow {
    0%, 100% { filter: drop-shadow(0 0 12px rgba(52,211,153,.5)); }
    50%       { filter: drop-shadow(0 0 28px rgba(52,211,153,.9)); }
  }
  .gs-logo-glow { animation: gs-pulse-glow 3s ease-in-out infinite; }

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

  /* OTP digit boxes */
  .gs-otp-box {
    width: 52px;
    height: 60px;
    background: #0D1614;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 12px;
    color: #e2ebe5;
    font-size: 24px;
    font-weight: 600;
    text-align: center;
    font-family: 'DM Sans', sans-serif;
    transition: border-color .2s, box-shadow .2s;
    outline: none;
    caret-color: #34d399;
  }
  .gs-otp-box::placeholder { color: #1d3028; }
  .gs-otp-box:focus {
    border-color: rgba(52,211,153,.55);
    box-shadow: 0 0 0 3px rgba(52,211,153,.1);
  }
  .gs-otp-box.filled {
    border-color: rgba(52,211,153,.3);
    background: rgba(52,211,153,.04);
  }
  @keyframes gs-shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    40%     { transform: translateX(6px); }
    60%     { transform: translateX(-4px); }
    80%     { transform: translateX(4px); }
  }
  .gs-otp-shake {
    border-color: rgba(239,68,68,.5) !important;
    box-shadow: 0 0 0 3px rgba(239,68,68,.08) !important;
    animation: gs-shake 0.4s ease !important;
  }

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

  .gs-login-root::-webkit-scrollbar { display: none; }

  @media (min-width: 1024px) {
    .gs-left-panel::after {
      content: '';
      position: absolute;
      right: -1px; top: 0; bottom: 0; width: 60px;
      background: #080F0C;
      clip-path: polygon(100% 0, 100% 100%, 0 100%);
    }
  }

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
  .gs-checkbox:checked { background: #16a34a; border-color: #16a34a; }
  .gs-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 3px; top: 1px;
    width: 8px; height: 5px;
    border-left: 2px solid white;
    border-bottom: 2px solid white;
    transform: rotate(-45deg);
  }

  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ─── Hex helper ─────────────────────────────────────────────────────────── */
const HEX = ({ x, y, r, op = 0.2 }) => {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
  }).join(' ');
  return <polygon className="gs-hex" points={pts} fill="none" stroke="rgba(52,211,153,1)" strokeWidth="1" opacity={op} />;
};

/* ─── Step indicator ─────────────────────────────────────────────────────── */
const StepIndicator = ({ step }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:28 }}>
    {[1,2].map(n => (
      <div key={n} style={{
        height: 8,
        width: step === n ? 24 : 8,
        borderRadius: 4,
        background: step >= n ? '#34d399' : 'rgba(255,255,255,.08)',
        transition: 'all .35s cubic-bezier(.22,1,.36,1)',
      }} />
    ))}
    <span style={{ fontSize:10, color:'rgba(162,218,189,.3)', marginLeft:4, letterSpacing:'.08em', textTransform:'uppercase' }}>
      Step {step} of 2
    </span>
  </div>
);

/* ─── Main component ─────────────────────────────────────────────────────── */
const AdminLogin = () => {
  const navigate = useNavigate();

  // Step 1
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn,   setCapsLockOn]   = useState(false);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error,   setStep1Error]   = useState('');

  // Step 2
  const [step,        setStep]        = useState(1);
  const [totpDigits,  setTotpDigits]  = useState(['','','','','','']);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError,   setTotpError]   = useState('');
  const [shake,       setShake]       = useState(false);
  const [adminName,   setAdminName]   = useState('');

  const handleKeyUp = e => setCapsLockOn(e.getModifierState('CapsLock'));

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const getFactorId = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.find(f => f.status === 'verified');
    if (!factor) throw new Error('No verified authenticator found. Please enroll Google Authenticator first.');
    return factor.id;
  };

  /* ══════════════════ STEP 1 ══════════════════ */
  const handleStep1 = async e => {
    e.preventDefault();
    setStep1Error('');
    if (!email || !password) { setStep1Error('Please enter both email and password.'); return; }
    setStep1Loading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (authError) {
        if (authError.message.includes('Invalid login'))            setStep1Error('Invalid email or password. Access Denied.');
        else if (authError.message.includes('Email not confirmed')) setStep1Error('Email not confirmed. Check your inbox or ask a Super Admin.');
        else setStep1Error(authError.message);
        return;
      }
      const { data: adminRow, error: dbError } = await supabase
        .from('admin_users').select('role, is_active, full_name')
        .eq('email', authData.user.email).single();
      if (dbError || !adminRow) {
        await supabase.auth.signOut();
        setStep1Error('This account does not have admin portal access.');
        return;
      }
      if (!adminRow.is_active) {
        await supabase.auth.signOut();
        setStep1Error('Your admin account has been deactivated. Contact a Super Admin.');
        return;
      }
      setAdminName(adminRow.full_name || email.split('@')[0]);

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasTotp = factors?.totp?.some(f => f.status === 'verified');

      if (!hasTotp) {
        navigate('/setup-mfa');
        return;
      }

      setStep(2);
    } catch (err) {
      console.error('Login error:', err);
      setStep1Error('An unexpected error occurred. Please try again.');
    } finally {
      setStep1Loading(false);
    }
  };

  /* ══════════════════ STEP 2 ══════════════════ */
  const verifyTotp = async code => {
    setTotpLoading(true);
    setTotpError('');
    try {
      const factorId = await getFactorId();
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId, challengeId: challenge.id, code,
      });
      if (verifyErr) {
        triggerShake();
        setTotpDigits(['','','','','','']);
        setTimeout(() => document.getElementById('gs-otp-0')?.focus(), 50);
        setTotpError('Incorrect code. Check Google Authenticator and try again.');
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      triggerShake();
      setTotpDigits(['','','','','','']);
      setTotpError(err.message || 'Verification failed. Please try again.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...totpDigits];
    next[index] = value.slice(-1);
    setTotpDigits(next);
    setTotpError('');
    if (value && index < 5) document.getElementById(`gs-otp-${index + 1}`)?.focus();
    if (value && index === 5 && next.every(d => d !== '')) {
      setTimeout(() => verifyTotp(next.join('')), 80);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !totpDigits[index] && index > 0) {
      document.getElementById(`gs-otp-${index - 1}`)?.focus();
    }
    if (e.key === 'Enter' && totpDigits.every(d => d !== '')) {
      verifyTotp(totpDigits.join(''));
    }
  };

  const handleOtpPaste = e => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (!pasted) return;
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setTotpDigits(next);
    document.getElementById(`gs-otp-${Math.min(pasted.length, 5)}`)?.focus();
    if (pasted.length === 6) setTimeout(() => verifyTotp(pasted), 80);
  };

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <>
      <style>{STYLES}</style>
      <div className="gs-login-root" style={{
        minHeight:'100vh', display:'flex',
        background:'#080F0C', fontFamily:"'DM Sans', sans-serif", overflow:'hidden',
      }}>

        {/* ── LEFT PANEL ── */}
        <div className="gs-left-panel" style={{
          display:'none', position:'relative', overflow:'hidden',
          background:'linear-gradient(145deg, #0A1F14 0%, #061209 50%, #030D07 100%)',
          flex:'0 0 52%',
        }}>
          <svg style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none' }}
            viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
            {[
              [80,100,55,.12],[190,100,55,.18],[300,100,55,.10],[410,100,55,.15],[520,100,55,.08],
              [135,195,55,.22],[245,195,55,.14],[355,195,55,.20],[465,195,55,.11],
              [80,290,55,.16],[190,290,55,.24],[300,290,55,.13],[410,290,55,.19],[520,290,55,.09],
              [135,385,55,.17],[245,385,55,.21],[355,385,55,.12],[465,385,55,.16],
              [80,480,55,.11],[190,480,55,.18],[300,480,55,.23],[410,480,55,.14],[520,480,55,.10],
              [135,575,55,.20],[245,575,55,.13],[355,575,55,.17],[465,575,55,.22],
              [80,670,55,.14],[190,670,55,.20],[300,670,55,.11],[410,670,55,.17],[520,670,55,.09],
              [300,400,180,.04],[300,400,240,.025],
            ].map(([x,y,r,op],i) => <HEX key={i} x={x} y={y} r={r} op={op} />)}
          </svg>
          <div style={{ position:'absolute',inset:0,pointerEvents:'none',
            background:'radial-gradient(ellipse 60% 55% at 45% 50%, rgba(22,163,74,.12) 0%, transparent 70%)' }} />
          <div style={{ position:'relative',zIndex:10,display:'flex',flexDirection:'column',height:'100%',padding:'56px 52px' }}>
            <div className="gs-animate gs-delay-1" style={{ marginBottom:'auto' }}>
              
              {/* 2. UPDATED DESKTOP LOGO PANELS */}
              <div className="gs-logo-glow" style={{ width:85,height:85,marginBottom:20 }}>
                <img 
                  src={logo} 
                  alt="Logo" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              </div>

              <div style={{ fontFamily:"'DM Serif Display', serif",fontSize:44,fontWeight:400,letterSpacing:'-0.5px',lineHeight:1.1,marginBottom:16 }}>
                <span style={{ color:'#e2ebe5' }}>Green</span><span style={{ color:'#34d399' }}>Sort</span>
              </div>
              <p style={{ fontSize:14,color:'rgba(162,218,189,.55)',lineHeight:1.7,maxWidth:320,fontWeight:300 }}>
                Waste intelligence platform for a cleaner tomorrow. Manage your recycling network from one secure place.
              </p>
            </div>
            <div className="gs-animate gs-delay-2" style={{ margin:'48px 0',display:'flex',flexDirection:'column',gap:12 }}>
              {['Real-time network monitoring','AI-powered content moderation','Full audit trail & log management'].map(label => (
                <div key={label} className="gs-stat-pill">
                  <span style={{ width:6,height:6,borderRadius:'50%',background:'#34d399',display:'inline-block' }} />
                  {label}
                </div>
              ))}
            </div>
            <div className="gs-animate gs-delay-3" style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:32,height:32,borderRadius:8,background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <svg width="16" height="16" fill="none" stroke="#34d399" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize:11,color:'rgba(52,211,153,.6)',letterSpacing:'.1em',textTransform:'uppercase',margin:0 }}>Restricted Area</p>
                <p style={{ fontSize:10,color:'rgba(162,218,189,.3)',margin:0 }}>Authorized Personnel Only</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',
          padding:'40px 24px',background:'#080F0C',position:'relative' }}>
          <div style={{ position:'absolute',top:-80,right:-80,width:360,height:360,
            background:'radial-gradient(circle, rgba(22,163,74,.07) 0%, transparent 70%)',pointerEvents:'none' }} />
          <div style={{ position:'absolute',bottom:-60,left:-60,width:280,height:280,
            background:'radial-gradient(circle, rgba(52,211,153,.04) 0%, transparent 70%)',pointerEvents:'none' }} />

          <div style={{ width:'100%',maxWidth:400,position:'relative',zIndex:1 }}>

            {/* 3. UPDATED MOBILE LOGO PANELS */}
            <div className="gs-animate gs-delay-1" style={{ textAlign:'center',marginBottom:24 }}>
              <div className="gs-logo-glow" style={{ width:60,height:60,margin:'0 auto 10px' }}>
                <img 
                  src={logo} 
                  alt="Logo" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              </div>
              <p style={{ fontSize:10,color:'rgba(52,211,153,.45)',letterSpacing:'.2em',textTransform:'uppercase',margin:0 }}>
                GreenSort Admin
              </p>
            </div>

            <StepIndicator step={step} />

            {/* ═══════ STEP 1: Credentials ═══════ */}
            {step === 1 && (
              <>
                <div className="gs-animate gs-delay-1" style={{ marginBottom:28 }}>
                  <h2 style={{ fontFamily:"'DM Serif Display', serif",fontSize:28,fontWeight:400,color:'#e2ebe5',
                    margin:'0 0 6px',letterSpacing:'-.3px',lineHeight:1.2 }}>Welcome back</h2>
                  <p style={{ fontSize:13,color:'rgba(162,218,189,.4)',margin:0,fontWeight:300 }}>
                    Step 1 of 2 — sign in with your credentials.
                  </p>
                </div>

                {step1Error && (
                  <div className="gs-animate" style={{ marginBottom:18,padding:'11px 14px',
                    background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',borderRadius:12,
                    display:'flex',alignItems:'center',gap:10 }}>
                    <svg width="15" height="15" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span style={{ fontSize:13,color:'#f87171',fontWeight:500 }}>{step1Error}</span>
                  </div>
                )}

                <form onSubmit={handleStep1}>
                  <div className="gs-animate gs-delay-2" style={{ marginBottom:16 }}>
                    <label style={{ display:'block',fontSize:11,fontWeight:600,color:'rgba(52,211,153,.7)',
                      letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8 }}>Email</label>
                    <input className="gs-input" type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@greensort.app" autoComplete="email" />
                  </div>

                  <div className="gs-animate gs-delay-3" style={{ marginBottom:20 }}>
                    <label style={{ display:'block',fontSize:11,fontWeight:600,color:'rgba(52,211,153,.7)',
                      letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8 }}>Password</label>
                    <div style={{ position:'relative' }}>
                      <input className="gs-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        onKeyUp={handleKeyUp} placeholder="••••••••"
                        autoComplete="current-password" style={{ paddingRight:46 }} />
                      <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                        position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',
                        background:'none',border:'none',cursor:'pointer',padding:0,
                        color:'rgba(162,218,189,.35)',transition:'color .2s',display:'flex',alignItems:'center' }}
                        onMouseEnter={e => e.currentTarget.style.color='#34d399'}
                        onMouseLeave={e => e.currentTarget.style.color='rgba(162,218,189,.35)'}>
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
                    {capsLockOn && (
                      <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:7 }}>
                        <svg width="12" height="12" fill="none" stroke="#fbbf24" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <span style={{ fontSize:11,color:'#fbbf24' }}>Caps Lock is ON</span>
                      </div>
                    )}
                  </div>

                  <div className="gs-animate gs-delay-3" style={{ display:'flex',alignItems:'center',
                    justifyContent:'space-between',marginBottom:24 }}>
                    <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer' }}>
                      <input type="checkbox" className="gs-checkbox" />
                      <span style={{ fontSize:13,color:'rgba(162,218,189,.4)',fontWeight:400 }}>Remember me</span>
                    </label>
                    <a href="#" style={{ fontSize:12,color:'rgba(52,211,153,.5)',textDecoration:'none',fontWeight:500,transition:'color .2s' }}
                      onMouseEnter={e => e.currentTarget.style.color='#34d399'}
                      onMouseLeave={e => e.currentTarget.style.color='rgba(52,211,153,.5)'}>
                      Forgot password?
                    </a>
                  </div>

                  <div className="gs-animate gs-delay-4">
                    <button type="submit" disabled={step1Loading} className="gs-btn-primary" style={{
                      width:'100%',padding:'14px 24px',borderRadius:12,border:'none',
                      color:'#052e16',fontSize:13,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',
                      cursor:step1Loading?'not-allowed':'pointer',opacity:step1Loading?0.7:1,
                      display:'flex',alignItems:'center',justifyContent:'center',gap:10,
                      fontFamily:"'DM Sans', sans-serif" }}>
                      {step1Loading ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="2.5"
                            style={{ animation:'spin 0.8s linear infinite' }}>
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                          </svg>
                          Verifying…
                        </>
                      ) : (
                        <>Continue <svg width="15" height="15" fill="none" stroke="#052e16" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ═══════ STEP 2: Google Authenticator ═══════ */}
            {step === 2 && (
              <>
                <div className="gs-animate gs-delay-1" style={{ marginBottom:28 }}>
                  <div style={{ width:52,height:52,borderRadius:14,
                    background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.2)',
                    display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16 }}>
                    <svg width="26" height="26" fill="none" stroke="#34d399" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                  </div>
                  <h2 style={{ fontFamily:"'DM Serif Display', serif",fontSize:26,fontWeight:400,
                    color:'#e2ebe5',margin:'0 0 8px',lineHeight:1.2 }}>Two-factor auth</h2>
                  <p style={{ fontSize:13,color:'rgba(162,218,189,.4)',margin:0,fontWeight:300,lineHeight:1.6 }}>
                    Hi <span style={{ color:'rgba(52,211,153,.75)',fontWeight:500 }}>{adminName.split(' ')[0]}</span>.{' '}
                    Open <span style={{ color:'rgba(162,218,189,.65)' }}>Google Authenticator</span> and enter the 6‑digit code for GreenSort Admin.
                  </p>
                </div>

                {totpError && (
                  <div className="gs-animate" style={{ marginBottom:18,padding:'11px 14px',
                    background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',borderRadius:12,
                    display:'flex',alignItems:'center',gap:10 }}>
                    <svg width="15" height="15" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span style={{ fontSize:13,color:'#f87171',fontWeight:500 }}>{totpError}</span>
                  </div>
                )}

                <div className="gs-animate gs-delay-2"
                  style={{ display:'flex',gap:8,justifyContent:'center',marginBottom:10 }}
                  onPaste={handleOtpPaste}>
                  {totpDigits.map((digit, i) => (
                    <input
                      key={i}
                      id={`gs-otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={`gs-otp-box${digit ? ' filled':''}${shake ? ' gs-otp-shake':''}`}
                      autoFocus={i === 0}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                <p style={{ fontSize:11,color:'rgba(162,218,189,.22)',textAlign:'center',marginBottom:24,marginTop:10 }}>
                  Code refreshes every 30 s · use the current code shown in the app
                </p>

                <div className="gs-animate gs-delay-3">
                  <button
                    onClick={() => verifyTotp(totpDigits.join(''))}
                    disabled={totpLoading || totpDigits.some(d => d === '')}
                    className="gs-btn-primary"
                    style={{
                      width:'100%',padding:'14px 24px',borderRadius:12,border:'none',
                      color:'#052e16',fontSize:13,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',
                      cursor:(totpLoading||totpDigits.some(d=>d===''))?'not-allowed':'pointer',
                      opacity:(totpLoading||totpDigits.some(d=>d===''))?0.45:1,
                      display:'flex',alignItems:'center',justifyContent:'center',gap:10,
                      fontFamily:"'DM Sans', sans-serif" }}>
                    {totpLoading ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="2.5"
                          style={{ animation:'spin 0.8s linear infinite' }}>
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        </svg>
                        Verifying…
                      </>
                    ) : (
                      <>
                        Verify & Sign In
                        <svg width="15" height="15" fill="none" stroke="#052e16" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                      </>
                    )}
                  </button>
                </div>

                <div className="gs-animate gs-delay-4" style={{ textAlign:'center',marginTop:20 }}>
                  <button onClick={async () => {
                    await supabase.auth.signOut();
                    setStep(1); setTotpDigits(['','','','','','']); setTotpError('');
                  }} style={{ background:'none',border:'none',cursor:'pointer',
                    fontSize:12,color:'rgba(52,211,153,.38)',fontFamily:"'DM Sans', sans-serif",
                    transition:'color .2s',padding:0 }}
                    onMouseEnter={e => e.currentTarget.style.color='rgba(52,211,153,.7)'}
                    onMouseLeave={e => e.currentTarget.style.color='rgba(52,211,153,.38)'}>
                    ← Back to sign in
                  </button>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="gs-animate gs-delay-5" style={{ marginTop:32,paddingTop:20,
              borderTop:'1px solid rgba(255,255,255,.04)',textAlign:'center' }}>
              <p style={{ fontSize:10,color:'rgba(162,218,189,.15)',letterSpacing:'.12em',textTransform:'uppercase',margin:0 }}>
                GreenSort Admin Portal · v2.0
              </p>
            </div>
          </div>
        </div>

        <style>{`
          @media (min-width: 1024px) { .gs-left-panel { display: flex !important; flex-direction: column; } }
        `}</style>
      </div>
    </>
  );
};

export default AdminLogin;
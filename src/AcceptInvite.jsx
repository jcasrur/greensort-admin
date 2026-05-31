import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import logo from './assets/logo.png';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  .gs-invite-root * { box-sizing: border-box; }

  @keyframes gs-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .gs-animate {
    animation: gs-fade-up 0.55s cubic-bezier(.22,1,.36,1) both;
  }

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

  .gs-input::placeholder {
    color: #3a5046;
  }

  .gs-input:focus {
    border-color: rgba(52,211,153,.45);
    box-shadow: 0 0 0 3px rgba(52,211,153,.08);
  }

  .gs-btn-primary {
    background: linear-gradient(90deg, #16a34a, #34d399, #16a34a);
    background-size: 200% auto;
    transition: background-position .5s, transform .15s, box-shadow .2s;
  }

  .gs-btn-primary:hover {
    background-position: right center;
    box-shadow: 0 0 28px rgba(52,211,153,.35);
  }

  .gs-btn-primary:active {
    transform: scale(.97);
  }
`;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export default function AcceptInvite() {
  const navigate = useNavigate();

  const queryToken = useMemo(() => {
    return new URLSearchParams(window.location.search).get('token') || '';
  }, []);

  const [invite, setInvite] = useState(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // BAGONG STATES PARA SA OTP FLOW
  const [isWaitingForOtp, setIsWaitingForOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const loadInvite = async () => {
    const cleanToken = String(queryToken || '').trim();

    setError('');
    setSuccess('');
    setInvite(null);

    if (!cleanToken) {
      setChecking(false);
      setError('Invalid invitation link. Please use the Accept Admin Invite button from your email.');
      return;
    }

    setChecking(true);

    try {
      const { data, error: inviteError } = await supabase
        .from('admin_invitations')
        .select('id, email, role, is_used, expires_at')
        .eq('token', cleanToken)
        .maybeSingle();

      if (inviteError) throw inviteError;
      if (!data) throw new Error('Invitation not found. Please ask the Super Admin for a new invite.');
      if (data.is_used) throw new Error('This invitation has already been used. Please sign in instead.');
      if (new Date(data.expires_at).getTime() < Date.now()) throw new Error('This invitation has expired. Ask the Super Admin to send a new invite.');

      setInvite(data);
    } catch (err) {
      console.error('Invite validation error:', err);
      setError(err.message || 'Failed to open invitation.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // STEP 1: ISUBMIT ANG PANGALAN AT PASSWORD, AT MAG-SEND NG OTP EMAIL
  const handleCreatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanName = fullName.trim();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();
    const cleanEmail = normalizeEmail(invite.email);

    if (!cleanName) return setError('Please enter your full name.');
    if (cleanPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (cleanPassword !== cleanConfirm) return setError('Passwords do not match.');

    setSubmitting(true);

    try {
      // Mag-trigger ng sign up para mag-send si Supabase ng 8-digit code email
      const { error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: cleanName,
            role: invite.role || 'admin',
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already')) {
          throw new Error('This email already has an account. Please go back to login and sign in.');
        }
        throw signUpError;
      }

      // Success sending email! Ilipat sa OTP Screen
      setSuccess('Verification code sent! Please check your email.');
      setIsWaitingForOtp(true);
    } catch (err) {
      console.error('Accept invite error:', err);
      setError(err.message || 'Failed to create password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 2: I-VERIFY ANG OTP CODE AT I-SAVE SA DATABASE
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 8) {
      return setError('Please enter the 8-digit verification code.');
    }

    setSubmitting(true);

    try {
      const cleanEmail = normalizeEmail(invite.email);

      // Verify the 8-digit code
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'signup' // Mahalagang signup flow ito
      });

      if (verifyError) throw verifyError;

      // Kapag verified na, tsaka natin isi-save sa public tables
      const user = verifyData.user;
      const cleanName = fullName.trim();

      const adminPayload = {
        email: cleanEmail,
        full_name: cleanName,
        role: invite.role || 'admin',
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      await supabase.from('admin_users').upsert(adminPayload, { onConflict: 'email' });
      
      await supabase.from('profiles').upsert({
        id: user.id,
        email: cleanEmail,
        full_name: cleanName,
        role: invite.role || 'admin',
        status: 'Active',
        account_status: 'active',
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      await supabase.from('admin_invitations').update({ is_used: true }).eq('id', invite.id);

      // Diretso sa MFA Setup!
      setSuccess('Account verified successfully. Redirecting to Google Authenticator setup...');
      setTimeout(() => {
        navigate('/setup-mfa?from=invite');
      }, 900);

    } catch (err) {
      console.error('OTP verify error:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{STYLES}</style>
      <div
        className="gs-invite-root"
        style={{
          minHeight: '100vh',
          background: '#080F0C',
          fontFamily: "'DM Sans', sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 20% 20%, rgba(52,211,153,.08), transparent 28%), radial-gradient(circle at 80% 80%, rgba(22,163,74,.08), transparent 30%)' }} />

        <div className="gs-animate" style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src={logo} alt="GreenSort" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 12 }} />
            <p style={{ fontSize: 10, color: 'rgba(52,211,153,.45)', letterSpacing: '.2em', textTransform: 'uppercase', margin: 0 }}>
              GreenSort Admin
            </p>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, fontWeight: 400, color: '#e2ebe5', margin: '8px 0 6px' }}>
              {isWaitingForOtp ? 'Check your email' : 'Create your password'}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(162,218,189,.42)', margin: 0, lineHeight: 1.6 }}>
              {isWaitingForOtp 
                ? 'We sent an 8-digit verification code to your email.' 
                : 'Set up your admin account before Google Authenticator verification.'}
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 24, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,.35)' }}>
            
            {checking && (
              <div style={{ marginBottom: 16, padding: '14px', background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.16)', borderRadius: 12, color: '#34d399', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                Opening your admin invitation...
              </div>
            )}

            {error && (
              <div style={{ marginBottom: 16, padding: '11px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, color: '#f87171', fontSize: 13, fontWeight: 500 }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ marginBottom: 16, padding: '11px 14px', background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.22)', borderRadius: 12, color: '#34d399', fontSize: 13, fontWeight: 500 }}>
                {success}
              </div>
            )}

            {!checking && invite && !isWaitingForOtp && (
              <>
                <div style={{ marginBottom: 18, padding: 14, borderRadius: 14, background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.14)' }}>
                  <p style={{ margin: '0 0 4px', color: 'rgba(162,218,189,.48)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>Invitation verified</p>
                  <p style={{ margin: 0, color: '#e2ebe5', fontSize: 14, fontWeight: 700 }}>{invite.email}</p>
                </div>

                <form onSubmit={handleCreatePassword}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(52,211,153,.7)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Full Name</label>
                    <input className="gs-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter full name" />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(52,211,153,.7)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Password</label>
                    <input className="gs-input" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(52,211,153,.7)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Confirm Password</label>
                    <input className="gs-input" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, color: 'rgba(162,218,189,.45)', fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} />
                    Show password
                  </label>

                  <button type="submit" disabled={submitting} className="gs-btn-primary" style={{ width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none', color: '#052e16', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? 'Sending code...' : 'Create Password & Send Code'}
                  </button>
                </form>
              </>
            )}

            {!checking && invite && isWaitingForOtp && (
              <form onSubmit={handleVerifyOtp} className="gs-animate">
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(52,211,153,.7)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    8-Digit Verification Code
                    </label>
                  <input 
                    className="gs-input" 
                    type="text" 
                    maxLength={8}
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    placeholder="Enter 8-digit code" 
                    style={{ fontSize: 20, letterSpacing: '4px', textAlign: 'center', padding: '16px' }}
                  />
                </div>

                <button type="submit" disabled={submitting} className="gs-btn-primary" style={{ width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none', color: '#052e16', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? 'Verifying...' : 'Verify & Continue'}
                  </button>
              </form>
            )}

            {/* ERROR STATE: Kung hindi ma-load ang invite (e.g. invalid link) */}
            {!checking && !invite && (
              <button type="button" onClick={() => navigate('/')} className="gs-btn-primary" style={{ width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none', color: '#052e16', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}>
                Back to Login
              </button>
            )}

            {/* NEW: Back to login link kapag naglo-load or during setup process */}
            {!checking && invite && (
              <div style={{ textAlign: 'center', marginTop: 24 }} className="gs-animate">
                <button 
                  type="button" 
                  onClick={() => navigate('/')} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'rgba(52,211,153,.45)', 
                    fontSize: 12, 
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'color .2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color='rgba(52,211,153,.8)'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(52,211,153,.45)'}
                >
                  ← Back to login
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
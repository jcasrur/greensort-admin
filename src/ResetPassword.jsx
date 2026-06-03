import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import logo from './assets/logo.png';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  .gs-reset-root * { box-sizing: border-box; }

  @keyframes gs-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes gs-spin {
    to { transform: rotate(360deg); }
  }

  .gs-reset-animate {
    animation: gs-fade-up 0.45s cubic-bezier(.22,1,.36,1) both;
  }

  .gs-reset-input {
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

  .gs-reset-input::placeholder {
    color: #3a5046;
  }

  .gs-reset-input:focus {
    border-color: rgba(52,211,153,.45);
    box-shadow: 0 0 0 3px rgba(52,211,153,.08);
  }

  .gs-reset-btn {
    width: 100%;
    padding: 14px 24px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(90deg, #16a34a, #34d399, #16a34a);
    background-size: 200% auto;
    color: #052e16;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background-position .5s, opacity .2s, transform .15s;
  }

  .gs-reset-btn:hover {
    background-position: right center;
  }

  .gs-reset-btn:active {
    transform: scale(.98);
  }

  .gs-reset-btn:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .gs-reset-link {
    background: none;
    border: none;
    color: rgba(52,211,153,.48);
    font-size: 12px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  .gs-reset-link:hover {
    color: #34d399;
  }
`;

const STEPS = {
  RECOVERY: 'recovery',
  MFA: 'mfa',
  SUCCESS: 'success',
};

const emptyMfaDigits = ['', '', '', '', '', ''];

function getInitialEmail() {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get('email') || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export default function ResetPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.RECOVERY);

  const [email, setEmail] = useState(getInitialEmail);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [mfaDigits, setMfaDigits] = useState(emptyMfaDigits);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaChallengeId, setMfaChallengeId] = useState('');

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const mfaCode = useMemo(() => mfaDigits.join(''), [mfaDigits]);

  useEffect(() => {
    const restoreSessionFromHash = async () => {
      const hash = window.location.hash || '';

      if (!hash.includes('access_token')) return;

      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) return;

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!sessionError) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    };

    restoreSessionFromHash();
  }, []);

  const validateBaseInputs = () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = recoveryCode.trim();
    const cleanPassword = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return null;
    }

    if (!cleanCode || cleanCode.length < 6) {
      setError('Please enter the recovery code from your email.');
      return null;
    }

    if (cleanPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return null;
    }

    if (cleanPassword !== cleanConfirm) {
      setError('Passwords do not match.');
      return null;
    }

    return {
      cleanEmail,
      cleanCode,
      cleanPassword,
    };
  };

  const startMfaChallenge = async () => {
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

    if (factorsError) throw factorsError;

    const verifiedTotp = factorsData?.totp?.find((factor) => factor.status === 'verified');

    if (!verifiedTotp) {
      return false;
    }

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: verifiedTotp.id,
    });

    if (challengeError) throw challengeError;

    setMfaFactorId(verifiedTotp.id);
    setMfaChallengeId(challengeData.id);
    setMfaDigits(emptyMfaDigits);
    setStep(STEPS.MFA);

    setTimeout(() => {
      document.getElementById('gs-reset-mfa-0')?.focus();
    }, 80);

    return true;
  };

  const updatePasswordAndFinish = async (passwordToSave) => {
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordToSave,
    });

    if (updateError) throw updateError;

    setStep(STEPS.SUCCESS);
    setMessage('Password updated successfully. Redirecting to login...');

    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/');
    }, 1400);
  };

  const handleVerifyRecovery = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    const values = validateBaseInputs();
    if (!values) return;

    setLoading(true);

    try {
      const { cleanEmail, cleanCode, cleanPassword } = values;

      const { error: otpError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'recovery',
      });

      if (otpError) throw otpError;

      const needsMfa = await startMfaChallenge();

      if (needsMfa) {
        setMessage('Recovery code verified. Enter your Google Authenticator code to continue.');
        return;
      }

      await updatePasswordAndFinish(cleanPassword);
    } catch (err) {
      console.error('Recovery reset error:', err);
      setError(err.message || 'Failed to verify recovery code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfaAndUpdate = async (e) => {
    e?.preventDefault?.();

    setError('');
    setMessage('');

    const cleanPassword = newPassword.trim();

    if (mfaCode.length !== 6) {
      setError('Please enter the 6-digit Google Authenticator code.');
      return;
    }

    setLoading(true);

    try {
      let challengeId = mfaChallengeId;

      if (!mfaFactorId) {
        throw new Error('Missing MFA factor. Please verify your recovery code again.');
      }

      if (!challengeId) {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: mfaFactorId,
        });

        if (challengeError) throw challengeError;

        challengeId = challengeData.id;
        setMfaChallengeId(challengeId);
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId,
        code: mfaCode,
      });

      if (verifyError) {
        setMfaDigits(emptyMfaDigits);
        setTimeout(() => document.getElementById('gs-reset-mfa-0')?.focus(), 80);
        throw verifyError;
      }

      await updatePasswordAndFinish(cleanPassword);
    } catch (err) {
      console.error('MFA reset error:', err);
      setError(err.message || 'Failed to verify Google Authenticator code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendRecoveryCode = async () => {
    setError('');
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your email address first.');
      return;
    }

    setResendLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password?email=${encodeURIComponent(cleanEmail)}`,
      });

      if (resetError) throw resetError;

      setMessage('New recovery code sent. Please check your email.');
    } catch (err) {
      console.error('Resend recovery code error:', err);
      setError(err.message || 'Failed to resend recovery code.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleMfaChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const next = [...mfaDigits];
    next[index] = value.slice(-1);

    setMfaDigits(next);
    setError('');

    if (value && index < 5) {
      document.getElementById(`gs-reset-mfa-${index + 1}`)?.focus();
    }

    if (value && index === 5 && next.every((digit) => digit !== '')) {
      setTimeout(() => {
        handleVerifyMfaAndUpdate();
      }, 100);
    }
  };

  const handleMfaKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !mfaDigits[index] && index > 0) {
      document.getElementById(`gs-reset-mfa-${index - 1}`)?.focus();
    }

    if (e.key === 'Enter' && mfaDigits.every((digit) => digit !== '')) {
      handleVerifyMfaAndUpdate(e);
    }
  };

  const handleMfaPaste = (e) => {
    e.preventDefault();

    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = emptyMfaDigits.map((_, i) => pasted[i] || '');
    setMfaDigits(next);

    if (pasted.length === 6) {
      setTimeout(() => {
        handleVerifyMfaAndUpdate();
      }, 100);
    }
  };

  return (
    <>
      <style>{STYLES}</style>

      <div
        className="gs-reset-root"
        style={{
          minHeight: '100vh',
          background: '#080F0C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(circle at 20% 20%, rgba(52,211,153,.08), transparent 28%), radial-gradient(circle at 80% 80%, rgba(22,163,74,.08), transparent 30%)',
          }}
        />

        <div
          className="gs-reset-animate"
          style={{
            width: '100%',
            maxWidth: 460,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src={logo}
              alt="GreenSort"
              style={{
                width: 64,
                height: 64,
                objectFit: 'contain',
                marginBottom: 10,
              }}
            />

            <p
              style={{
                fontSize: 10,
                color: 'rgba(52,211,153,.45)',
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              GreenSort Admin
            </p>

            <h1
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 34,
                fontWeight: 400,
                color: '#e2ebe5',
                margin: '8px 0 6px',
              }}
            >
              {step === STEPS.MFA ? 'Verify Authenticator' : step === STEPS.SUCCESS ? 'Password Updated' : 'Reset Password'}
            </h1>

            <p
              style={{
                fontSize: 13,
                color: 'rgba(162,218,189,.42)',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {step === STEPS.MFA
                ? 'Enter the 6-digit code from Google Authenticator.'
                : step === STEPS.SUCCESS
                  ? 'Your account password has been changed.'
                  : 'Enter your email, recovery code, and new password.'}
            </p>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,.025)',
              border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 24,
              padding: 28,
              boxShadow: '0 24px 80px rgba(0,0,0,.35)',
            }}
          >
            {error && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '12px 14px',
                  background: 'rgba(239,68,68,.08)',
                  border: '1px solid rgba(239,68,68,.25)',
                  borderRadius: 12,
                  color: '#f87171',
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.6,
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '12px 14px',
                  background: 'rgba(52,211,153,.08)',
                  border: '1px solid rgba(52,211,153,.22)',
                  borderRadius: 12,
                  color: '#34d399',
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.6,
                }}
              >
                {message}
              </div>
            )}

            {step === STEPS.RECOVERY && (
              <form onSubmit={handleVerifyRecovery}>
                <InputGroup
                  label="Email Address"
                  value={email}
                  onChange={(value) => setEmail(value)}
                  placeholder="admin@greensort.app"
                  type="email"
                  autoComplete="email"
                />

                <InputGroup
                  label="8-Digit Recovery Code"
                  value={recoveryCode}
                  onChange={(value) => setRecoveryCode(value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Enter code from email"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />

                <InputGroup
                  label="New Password"
                  value={newPassword}
                  onChange={(value) => setNewPassword(value)}
                  placeholder="Minimum 8 characters"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                />

                <InputGroup
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(value) => setConfirmPassword(value)}
                  placeholder="Re-enter new password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                />

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 18,
                    color: 'rgba(162,218,189,.45)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Show password
                </label>

                <button className="gs-reset-btn" type="submit" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify Recovery Code'}
                </button>

                <button
                  className="gs-reset-link"
                  type="button"
                  disabled={resendLoading}
                  onClick={handleResendRecoveryCode}
                  style={{
                    marginTop: 18,
                    width: '100%',
                    opacity: resendLoading ? 0.5 : 1,
                    cursor: resendLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resendLoading ? 'Sending new code...' : 'Resend recovery code'}
                </button>

                <button
                  className="gs-reset-link"
                  type="button"
                  onClick={() => navigate('/')}
                  style={{
                    marginTop: 12,
                    width: '100%',
                  }}
                >
                  ← Back to login
                </button>
              </form>
            )}

            {step === STEPS.MFA && (
              <form onSubmit={handleVerifyMfaAndUpdate}>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'center',
                    marginBottom: 18,
                  }}
                  onPaste={handleMfaPaste}
                >
                  {mfaDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`gs-reset-mfa-${index}`}
                      value={digit}
                      maxLength={1}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      onChange={(e) => handleMfaChange(index, e.target.value)}
                      onKeyDown={(e) => handleMfaKeyDown(index, e)}
                      style={{
                        width: 52,
                        height: 60,
                        background: '#0D1614',
                        border: '1px solid rgba(255,255,255,.07)',
                        borderRadius: 12,
                        color: '#e2ebe5',
                        fontSize: 24,
                        fontWeight: 700,
                        textAlign: 'center',
                        outline: 'none',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                  ))}
                </div>

                <p
                  style={{
                    fontSize: 11,
                    color: 'rgba(162,218,189,.28)',
                    textAlign: 'center',
                    margin: '0 0 20px',
                    lineHeight: 1.6,
                  }}
                >
                  Open Google Authenticator and enter the current 6-digit GreenSort Admin code.
                </p>

                <button
                  className="gs-reset-btn"
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                >
                  {loading ? 'Updating...' : 'Verify Authenticator & Update Password'}
                </button>

                <button
                  className="gs-reset-link"
                  type="button"
                  onClick={() => {
                    setStep(STEPS.RECOVERY);
                    setMfaDigits(emptyMfaDigits);
                    setMfaFactorId('');
                    setMfaChallengeId('');
                    setMessage('');
                    setError('');
                  }}
                  style={{
                    marginTop: 18,
                    width: '100%',
                  }}
                >
                  ← Back to recovery code
                </button>
              </form>
            )}

            {step === STEPS.SUCCESS && (
              <button
                className="gs-reset-btn"
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/');
                }}
              >
                Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function InputGroup({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          color: 'rgba(52,211,153,.7)',
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {label}
      </label>

      <input
        className="gs-reset-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
      />
    </div>
  );
}

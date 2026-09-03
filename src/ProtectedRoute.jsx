import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import { supabase } from './supabase';

export default function ProtectedRoute({ children, module }) {
  const { loading, isAdmin, can } = useAdminAuth();
  const [mfaAllowed, setMfaAllowed] = useState(false);
  const [authVersion, setAuthVersion] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(event => {
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'MFA_CHALLENGE_VERIFIED'
      ) {
        setMfaAllowed(false);
        setAuthVersion(current => current + 1);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      if (loading) {
        setMfaAllowed(false);
        return;
      }

      setMfaAllowed(false);

      if (!isAdmin) {
        navigate('/', { replace: true });
        return;
      }

      if (module && !can(module)) {
        navigate('/unauthorized', { replace: true });
        return;
      }

      try {
        const { data, error } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (!active) return;

        if (error) throw error;

        const currentLevel = data?.currentLevel;
        const nextLevel = data?.nextLevel;

        // Password and authenticator are verified for this session.
        if (currentLevel === 'aal2') {
          setMfaAllowed(true);
          return;
        }

        // MFA is enrolled, but TOTP has not been entered this session.
        if (nextLevel === 'aal2') {
          navigate('/', { replace: true });
          return;
        }

        // No verified MFA factor is enrolled.
        navigate('/setup-mfa', { replace: true });
      } catch (error) {
        console.error('MFA access check failed:', error);

        if (active) {
          setMfaAllowed(false);
          navigate('/', { replace: true });
        }
      }
    };

    verifyAccess();

    return () => {
      active = false;
    };
  }, [
    loading,
    isAdmin,
    module,
    can,
    navigate,
    authVersion,
  ]);

  if (loading || !mfaAllowed) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070F07',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(52,211,153,0.15)',
            borderTopColor: '#34d399',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />

        <style>
          {'@keyframes spin { to { transform: rotate(360deg); } }'}
        </style>
      </div>
    );
  }

  if (!isAdmin) return null;
  if (module && !can(module)) return null;

  return children;
}
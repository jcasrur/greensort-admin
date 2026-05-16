// ProtectedRoute.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';

export default function ProtectedRoute({ children }) {
  const { loading, isAdmin } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [loading, isAdmin]);

  if (loading) return null;
  return children;
}
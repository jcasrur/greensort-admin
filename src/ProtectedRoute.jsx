import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';

export default function ProtectedRoute({ children, module }) {
  const { loading, isAdmin, can } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) { navigate('/', { replace: true }); return; }
    if (module && !can(module)) navigate('/unauthorized', { replace: true });
  }, [loading, isAdmin, module, can, navigate]);

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#070F07' }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(52,211,153,0.15)', borderTopColor:'#34d399', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!isAdmin) return null;
  if (module && !can(module)) return null;
  return children;
}

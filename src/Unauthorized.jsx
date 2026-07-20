import { useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { useAdminAuth } from './useAdminAuth';
import { supabase } from './supabase';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  coordinator: 'Mobile Coordinator',
  accounting: 'Accounting',
  receiving_staff: 'Receiving Staff',
  moderator: 'Moderator',
};

export default function Unauthorized() {
  const navigate = useNavigate();
  const { t, isLightMode } = useTheme();
  const { role } = useAdminAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${t.bg} px-4`}>
      <div className="text-center space-y-5 max-w-sm">
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${isLightMode ? 'bg-red-50' : 'bg-red-900/20'}`}>
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <div>
          <h1 className={`text-xl font-semibold ${t.textMain}`}>Access Restricted</h1>
          <p className={`text-sm mt-2 leading-relaxed ${t.textMuted}`}>
            {role
              ? `Your role (${ROLE_LABELS[role] || role}) does not have permission to view this page.`
              : 'Your account does not have admin portal access.'}
          </p>
        </div>
        <div className={`h-px w-16 mx-auto ${isLightMode ? 'bg-gray-200' : 'bg-white/10'}`} />
        <div className="flex flex-col gap-2">
          {role && (
            <button onClick={() => navigate('/dashboard', { replace: true })}
              className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-sm font-medium hover:bg-[#1f4d38] transition-colors">
              Go to Dashboard
            </button>
          )}
          <button onClick={handleSignOut}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isLightMode ? 'text-[#5E7A67] hover:bg-[#F3F6F1]' : 'text-[#A8BDA2] hover:bg-white/[0.04]'}`}>
            Sign out
          </button>
        </div>
        <p className={`text-[11px] ${t.textMuted}`}>WISHCRAFT Admin · Cavite Institute</p>
      </div>
    </div>
  );
}

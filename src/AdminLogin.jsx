import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [capsLockOn, setCapsLockOn] = useState(false);

  // 🟢 FUNCTION PARA MA-DETECT KUNG NAKA-CAPSLOCK
  const handleKeyUp = (e) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    // Simulate API call (Dito papasok ang Supabase sa susunod)
    setTimeout(() => {
      setIsLoading(false);
      
      // 🟢 PANSAMANTALANG CREDENTIALS (admin / admin123)
      if (username === 'admin' && password === 'admin123') {
        navigate('/dashboard'); // 👈 Lilipat sa Dashboard pag tama
      } else {
        setError('Invalid admin credentials. Access Denied.');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020C14] px-4 font-sans relative overflow-hidden">
      
      {/* Background Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#00C853]/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* The Card with the Glowing Green Shadow */}
      <div 
        className="w-full max-w-md bg-[#05131E]/90 backdrop-blur-xl rounded-2xl p-8 sm:p-10 relative z-10"
        style={{
          boxShadow: '0 0 40px rgba(0, 200, 83, 0.15), inset 0 0 10px rgba(0, 200, 83, 0.05)',
          border: '1px solid rgba(0, 200, 83, 0.1)'
        }}
      >
        {/* LOGO SECTION */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="w-16 h-16 mb-3 drop-shadow-[0_0_15px_rgba(0,200,83,0.5)]">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 15 C 65 15, 80 30, 80 50 C 80 50, 65 40, 50 40 C 35 40, 20 50, 20 50 C 20 30, 35 15, 50 15 Z" fill="#00C853" opacity="0.9"/>
              <path d="M80 50 C 80 70, 65 85, 50 85 C 50 85, 55 70, 45 60 C 35 50, 20 50, 20 50 C 35 65, 55 75, 80 50 Z" fill="#00E676" opacity="0.9"/>
              <path d="M20 50 C 20 70, 35 85, 50 85 C 50 85, 45 70, 55 60 C 65 50, 80 50, 80 50 C 65 65, 45 75, 20 50 Z" fill="#69F0AE" opacity="0.9"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-widest text-white">
            <span className="text-gray-400">GREEN</span>
            <span className="text-[#00C853]">SORT</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></span>
            <p className="text-[10px] text-gray-400 tracking-[0.3em] uppercase">Admin Portal</p>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm text-center font-semibold flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-6">
          
          {/* USERNAME INPUT */}
          <div>
            <label className="block text-[#00C853] text-xs font-bold uppercase tracking-widest mb-2 ml-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#030A10] text-gray-200 px-4 py-3 rounded-xl border border-white/5 focus:border-[#00C853]/50 focus:outline-none focus:ring-1 focus:ring-[#00C853]/50 transition-all shadow-inner"
              placeholder="Enter admin username"
              autoComplete="username"
            />
          </div>

          {/* PASSWORD INPUT */}
          <div>
            <label className="block text-[#00C853] text-xs font-bold uppercase tracking-widest mb-2 ml-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={handleKeyUp}
                className="w-full bg-[#030A10] text-gray-200 px-4 py-3 rounded-xl border border-white/5 focus:border-[#00C853]/50 focus:outline-none focus:ring-1 focus:ring-[#00C853]/50 transition-all pr-12 shadow-inner"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {/* EYE ICON */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#00C853] transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                )}
              </button>
            </div>
            {/* 🔴 CAPS LOCK WARNING */}
            {capsLockOn && (
              <p className="text-yellow-500 text-xs mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Warning: Caps Lock is ON
              </p>
            )}
          </div>

          {/* ADDITIONAL OPTIONS */}
          <div className="flex items-center justify-between text-sm mt-2">
            <label className="flex items-center text-gray-400 cursor-pointer hover:text-gray-200 transition-colors">
              <input type="checkbox" className="mr-2 accent-[#00C853] bg-[#030A10] border-gray-600 rounded w-4 h-4" />
              Remember me
            </label>
            <a href="#" className="text-gray-500 hover:text-[#00C853] hover:underline transition-all text-xs">
              Forgot Password?
            </a>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00C853] hover:bg-[#00E676] text-[#020C14] font-black tracking-widest py-4 px-4 rounded-xl transition-all duration-200 mt-6 flex justify-center items-center shadow-[0_0_15px_rgba(0,200,83,0.3)] hover:shadow-[0_0_25px_rgba(0,200,83,0.5)] transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed uppercase"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#020C14]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
        
        {/* 🟢 SECURITY NOTICE FOOTER */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Restricted Area • Authorized Personnel Only</p>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
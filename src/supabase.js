import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yaqpvcriphvcqdmpsfxa.supabase.co';
const supabaseKey = 'sb_publishable_di2DEocf3L8DH9XUyy9CPg_r4uU0xQj';

const REMEMBER_ME_KEY = 'greensort_admin_remember_me';

const isBrowser = () => typeof window !== 'undefined';

const shouldRememberSession = () =>
  isBrowser() &&
  window.localStorage.getItem(REMEMBER_ME_KEY) === 'true';

const getActiveStorage = () => {
  if (!isBrowser()) return null;

  return shouldRememberSession()
    ? window.localStorage
    : window.sessionStorage;
};

const getInactiveStorage = () => {
  if (!isBrowser()) return null;

  return shouldRememberSession()
    ? window.sessionStorage
    : window.localStorage;
};

const authStorage = {
  getItem(key) {
    return getActiveStorage()?.getItem(key) ?? null;
  },

  setItem(key, value) {
    getActiveStorage()?.setItem(key, value);
    getInactiveStorage()?.removeItem(key);
  },

  removeItem(key) {
    if (!isBrowser()) return;

    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export const getRememberMePreference = () =>
  shouldRememberSession();

export const setRememberMePreference = rememberMe => {
  if (!isBrowser()) return;

  window.localStorage.setItem(
    REMEMBER_ME_KEY,
    rememberMe ? 'true' : 'false'
  );
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage,
  },
});
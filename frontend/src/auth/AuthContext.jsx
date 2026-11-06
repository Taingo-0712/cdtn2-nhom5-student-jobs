import { createContext, useContext, useEffect, useState } from 'react';
import { login } from '../api/authApi.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'nhom5.auth.session';

function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return session?.token && session?.user && session.expiresAt > Date.now()
      ? session
      : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  async function signIn(email, password) {
    const data = await login(email, password);
    const nextSession = {
      token: data.access_token,
      user: data.user,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  function signOut() {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }

  useEffect(() => {
    if (!session) return;

    const timer = window.setTimeout(() => {
      sessionStorage.removeItem(STORAGE_KEY);
      setSession(null);
    }, Math.max(0, session.expiresAt - Date.now()));

    return () => window.clearTimeout(timer);
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

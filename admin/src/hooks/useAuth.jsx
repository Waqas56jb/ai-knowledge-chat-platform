import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import * as authService from '../services/authService';
import { getSessionSync, subscribeSession } from '../services/sessionStore';

const AuthContext = createContext(null);

/**
 * Session state for the admin UI. The API enforces authorization on every request; this only decides
 * which screens to show. On load the profile is re-read with GET /auth/me (`verified` flips to true).
 */
export function AuthProvider({ children }) {
  const session = useSyncExternalStore(subscribeSession, getSessionSync, getSessionSync);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) { setVerified(false); return undefined; }
    let alive = true;
    setVerifyError(null);
    authService.loadCurrentUser().then(
      () => { if (alive) setVerified(true); },
      err => { if (alive) { setVerifyError(err); setVerified(true); } }
    );
    return () => { alive = false; };
  }, [userId]);

  const login = useCallback(async (email, password, remember) => {
    const res = await authService.login(email, password, remember);
    if (res.ok) setVerified(true);
    return res;
  }, []);
  const logout = useCallback(async () => { await authService.logout(); }, []);

  const value = {
    session,
    user: session?.user || null,
    name: authService.sessionName(session),
    verified,
    verifyError,
    login,
    logout
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

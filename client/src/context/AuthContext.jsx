import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { TOKEN_KEY } from '../api/client';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

// status: "checking" (validating a saved token) -> "signedIn" | "signedOut"
const initialState = {
  status: localStorage.getItem(TOKEN_KEY) ? 'checking' : 'signedOut',
  user: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SIGNED_IN':
      return { status: 'signedIn', user: action.user };
    case 'SIGNED_OUT':
      return { status: 'signedOut', user: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    dispatch({ type: 'SIGNED_OUT' });
  }, []);

  const saveSession = useCallback(({ user, token }) => {
    localStorage.setItem(TOKEN_KEY, token);
    dispatch({ type: 'SIGNED_IN', user });
    return user;
  }, []);

  const signIn = useCallback(async (credentials) => saveSession(await authApi.login(credentials)), [saveSession]);
  const signUp = useCallback(async (details) => saveSession(await authApi.register(details)), [saveSession]);

  // On page load: if a token was saved, ask the API who it belongs to
  useEffect(() => {
    if (state.status !== 'checking') return;
    authApi
      .me()
      .then((user) => dispatch({ type: 'SIGNED_IN', user }))
      .catch(signOut);
  }, [state.status, signOut]);

  // The Axios interceptor fires this when the API answers 401 (expired token)
  useEffect(() => {
    window.addEventListener('crm:unauthorized', signOut);
    return () => window.removeEventListener('crm:unauthorized', signOut);
  }, [signOut]);

  const value = useMemo(
    () => ({ ...state, isAdmin: state.user?.role === 'admin', signIn, signUp, signOut }),
    [state, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

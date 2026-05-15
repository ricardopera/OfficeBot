import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from "react";
import { Message } from "@arco-design/web-react";
import { useTranslation } from "./useTranslation";

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    id: string;
    username: string;
    email: string;
  } | null;
  token: string | null;
  csrfToken: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const [token, setToken] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await window.electron.ipcRenderer.invoke("auth:checkStatus");
      if (response.success && response.data) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        setToken(response.data.token);
        setCsrfToken(response.data.csrfToken);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await window.electron.ipcRenderer.invoke("auth:login", { username, password });
      if (response.success && response.data) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        setToken(response.data.token);
        setCsrfToken(response.data.csrfToken);
        document.cookie = `officebot-session=${response.data.token}; path=/; SameSite=Strict`;
        return true;
      }
      Message.error(t("errors.unauthorized"));
      return false;
    } catch {
      Message.error(t("errors.unauthorized"));
      return false;
    }
  }, [t]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    setCsrfToken(null);
    document.cookie = "officebot-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.electron.ipcRenderer.invoke("auth:logout");
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await window.electron.ipcRenderer.invoke("auth:refresh");
      if (response.success && response.data) {
        setToken(response.data.token);
        setCsrfToken(response.data.csrfToken);
      }
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        csrfToken,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export default useContext;
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTutor: boolean;
  isViewer: boolean;
  canUpload: boolean;
  canEdit: boolean;
  canDownload: boolean;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkCurrentSession() {
      const token = apiClient.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await apiClient.get<{ user: User }>('/auth/me');
        if (res.success && res.data) {
          setUser(res.data.user);
        } else {
          apiClient.setToken(null);
          setUser(null);
        }
      } catch {
        apiClient.setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkCurrentSession();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await apiClient.post<{ user: User; accessToken: string }>('/auth/login', {
      email,
      password: pass,
    });

    if (res.success && res.data) {
      apiClient.setToken(res.data.accessToken);
      setUser(res.data.user);
    } else {
      throw new Error(res.error?.message || 'Login gagal.');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      apiClient.setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isTutor: user?.role === 'TUTOR',
        isViewer: user?.role === 'VIEWER',
        canUpload: user?.role === 'ADMIN' || user?.role === 'TUTOR',
        canEdit: user?.role === 'ADMIN' || user?.role === 'TUTOR',
        canDownload: true,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

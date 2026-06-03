import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface Menu {
  id: string;
  title: string;
  url: string;
  icon: string;
  parentId: string;
  order: number;
}

interface UserProfile {
  email: string;
  name: string;
  picture: string;
  permissions: string[];
  menus: Menu[];
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  login: (token: string) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const fetchUserProfile = async (authToken: string) => {
    try {
      // In a real app, you should use an environment variable for the Gateway URL.
      // Assuming API Gateway runs on 8000
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
      const response = await fetch(`${BASE_URL}/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const result = await response.json();
      if (result.success && result.data) {
        setUser({
          email: result.data.email,
          name: result.data.name,
          picture: result.data.avatar || result.data.picture, // Handle fallback
          permissions: result.data.permissions || [],
          menus: result.data.menus || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch user profile', error);
      // Optional: fallback to decoded basic info
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('google_auth_token');
    if (savedToken) {
      try {
        const decoded = jwtDecode<any>(savedToken);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setToken(savedToken);
          // Temporary user profile while fetching
          setUser({
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture,
            permissions: [],
            menus: []
          });
          fetchUserProfile(savedToken);
        }
      } catch (error) {
        console.error('Invalid token', error);
        logout();
      }
    }
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('google_auth_token', newToken);
    setToken(newToken);
    try {
      const decoded = jwtDecode<any>(newToken);
      setUser({
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        permissions: [],
        menus: []
      });
      fetchUserProfile(newToken);
    } catch (error) {
      console.error('Error decoding token during login', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('google_auth_token');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchUserProfile(token);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshProfile, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

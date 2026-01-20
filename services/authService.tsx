import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';
import { dbManager } from './databaseService';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  debugLogin: () => Promise<void>;
  register: (username: string, password: string, apiKey: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateSessionApiKey: (key: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
        const user = await dbManager.authenticateUser(username, password);
        if (user) {
            setCurrentUser(user);
            return true;
        }
        return false;
    } catch (e) {
        console.error("Login Error", e);
        return false;
    }
  };

  const debugLogin = async (): Promise<void> => {
    try {
        const user = await dbManager.getOrCreateDebugUser();
        setCurrentUser(user);
    } catch (e) {
        console.error("Debug Login Error", e);
    }
  };

  const register = async (username: string, password: string, apiKey: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const result = await dbManager.registerUser(username, password, apiKey);
        if (result.success) {
            // Auto login logic handled by caller or separate call
        }
        return result;
    } catch (e) {
        console.error("Register Error", e);
        return { success: false, message: "Registration failed due to system error." };
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const updateSessionApiKey = (key: string) => {
      if (currentUser) {
          setCurrentUser({ ...currentUser, apiKey: key });
          dbManager.updateApiKey(currentUser.username, key);
      }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, debugLogin, register, logout, updateSessionApiKey }}>
      {children}
    </AuthContext.Provider>
  );
};
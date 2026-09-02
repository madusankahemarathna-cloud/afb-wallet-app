import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Wallet } from '../types';
import { ApiService } from '../services/api';
import { getSocket, joinUserRoom, joinOutletRoom, joinMerchantRoom } from '../services/socket';

interface AuthContextType {
  user: User | null;
  wallet: Wallet | null;
  loading: boolean;
  demoUsers: any[];
  login: (serviceNo: string, pin: string) => Promise<void>;
  quickLogin: (serviceNo: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  isSocketConnected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  // Initialize socket listener
  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setIsSocketConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const fetchDemoUsers = async () => {
    try {
      const data = await ApiService.getDemoUsers();
      if (data.success) {
        setDemoUsers(data.users);
      }
    } catch (e) {
      console.warn('Failed to load demo users list:', e);
    }
  };

  const refreshUser = async () => {
    try {
      const data = await ApiService.getMe();
      if (data.success && data.user) {
        setUser(data.user);
        setWallet(data.user.wallet || null);

        // Join socket rooms
        joinUserRoom(data.user.id);
        if (data.user.role === 'MERCHANT') {
          joinMerchantRoom(data.user.id);
          if (data.user.outlets && data.user.outlets.length > 0) {
            data.user.outlets.forEach((o: any) => joinOutletRoom(o.id));
          }
        }
      }
    } catch (e) {
      console.warn('Session expired or not logged in:', e);
      localStorage.removeItem('afb_auth_token');
      setUser(null);
      setWallet(null);
    }
  };

  const refreshWallet = async () => {
    try {
      const data = await ApiService.getBalance();
      if (data.success && data.wallet) {
        setWallet(data.wallet);
      }
    } catch (e) {
      console.warn('Error refreshing wallet:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchDemoUsers();
      const token = localStorage.getItem('afb_auth_token');
      if (token) {
        await refreshUser();
      } else {
        // Default login as demo Customer (Wg Cdr K. Perera) for immediate interactive experience
        await quickLogin('AFB-10452');
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (serviceNo: string, pin: string) => {
    const res = await ApiService.login(serviceNo, pin);
    if (res.success && res.token) {
      localStorage.setItem('afb_auth_token', res.token);
      setUser(res.user);
      setWallet(res.user.wallet || null);
      joinUserRoom(res.user.id);
      if (res.user.role === 'MERCHANT') {
        joinMerchantRoom(res.user.id);
        if (res.user.outlets) {
          res.user.outlets.forEach((o: any) => joinOutletRoom(o.id));
        }
      }
      await fetchDemoUsers();
    }
  };

  const quickLogin = async (serviceNo: string) => {
    const res = await ApiService.quickLogin(serviceNo);
    if (res.success && res.token) {
      localStorage.setItem('afb_auth_token', res.token);
      setUser(res.user);
      setWallet(res.user.wallet || null);
      joinUserRoom(res.user.id);
      if (res.user.role === 'MERCHANT') {
        joinMerchantRoom(res.user.id);
        if (res.user.outlets) {
          res.user.outlets.forEach((o: any) => joinOutletRoom(o.id));
        }
      }
      await fetchDemoUsers();
    }
  };

  const logout = () => {
    localStorage.removeItem('afb_auth_token');
    setUser(null);
    setWallet(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        loading,
        demoUsers,
        login,
        quickLogin,
        logout,
        refreshUser,
        refreshWallet,
        isSocketConnected
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

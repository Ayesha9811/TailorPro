import { create } from 'zustand';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: any | null;
  login: (token: string) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: Cookies.get('token') || null,
  isAuthenticated: !!Cookies.get('token'),
  user: null,
  
  login: (token: string) => {
    Cookies.set('token', token, { expires: 7 }); // 7 days
    set({ token, isAuthenticated: true });
  },
  
  logout: () => {
    Cookies.remove('token');
    set({ token: null, isAuthenticated: false, user: null });
  },

  fetchUser: async () => {
    if (!get().isAuthenticated) return;
    try {
      const response = await api.get('/users/me');
      set({ user: response.data });
    } catch (error) {
      console.error('Failed to fetch current user profile:', error);
      // If unauthorized, logout
      Cookies.remove('token');
      set({ token: null, isAuthenticated: false, user: null });
    }
  }
}));

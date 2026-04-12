import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface UserProfile {
  id: string;
  nickname: string;
  phone: string;
  gender: string;
  isNewUser?: boolean;
}

interface AppState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  hydrated: boolean;

  setAuth: (token: string, refreshToken: string, user: UserProfile) => void;
  clearAuth: () => void;
  setHydrated: (v: boolean) => void;
  hydrate: () => Promise<void>;
}

// Web fallback for SecureStore
const storage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string) {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    return SecureStore.deleteItemAsync(key);
  },
};

export const useAppStore = create<AppState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  setAuth: (token, refreshToken, user) => {
    storage.setItem('token', token);
    storage.setItem('refreshToken', refreshToken);
    storage.setItem('user', JSON.stringify(user));
    set({ token, refreshToken, user });
  },

  clearAuth: () => {
    storage.deleteItem('token');
    storage.deleteItem('refreshToken');
    storage.deleteItem('user');
    set({ token: null, refreshToken: null, user: null });
  },

  setHydrated: (v) => set({ hydrated: v }),

  hydrate: async () => {
    try {
      const token = await storage.getItem('token');
      const refreshToken = await storage.getItem('refreshToken');
      const userStr = await storage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      set({ token, refreshToken, user, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));

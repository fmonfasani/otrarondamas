import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { User, AuthCredentials, SignUpData, AuthResponse } from '@/types';
import { apiService } from '@/services/apiService';

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (credentials: AuthCredentials) => Promise<void>;
  signup: (data: SignUpData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setError: (error: string | null) => void;
  loadStoredAuth: () => Promise<void>;
}

const STORAGE_KEYS = {
  TOKEN: '@wapsell:auth_token',
  REFRESH_TOKEN: '@wapsell:refresh_token',
  USER: '@wapsell:user',
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  error: null,

  get isAuthenticated() {
    return !!get().token && !!get().user;
  },

  login: async (credentials: AuthCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post<AuthResponse>('/auth/login', credentials);
      const { user, token, refreshToken, expiresIn } = response.data;

      // Store tokens
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
      ]);

      if (refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        set({ refreshToken });
      }

      // Set auth header for subsequent requests
      apiService.setAuthToken(token);

      set({
        user,
        token,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  signup: async (data: SignUpData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post<AuthResponse>('/auth/signup', data);
      const { user, token, refreshToken } = response.data;

      // Store tokens
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
      ]);

      if (refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        set({ refreshToken });
      }

      apiService.setAuthToken(token);

      set({
        user,
        token,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      // Call logout endpoint if desired
      await apiService.post('/auth/logout', {});
    } catch (error) {
      // Continue logout even if API call fails
      console.warn('Logout API call failed:', error);
    }

    // Clear storage
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
    ]);

    // Clear auth header
    apiService.setAuthToken(null);

    set({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
    });
  },

  refreshAccessToken: async () => {
    try {
      const refreshToken = get().refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiService.post<AuthResponse>('/auth/refresh', {
        refreshToken,
      });

      const { token, refreshToken: newRefreshToken } = response.data;

      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      if (newRefreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        set({ refreshToken: newRefreshToken });
      }

      apiService.setAuthToken(token);

      set({ token });
    } catch (error) {
      // Refresh failed, logout user
      await get().logout();
      throw error;
    }
  },

  setUser: (user) => set({ user }),

  setToken: (token) => set({ token }),

  setRefreshToken: (refreshToken) => set({ refreshToken }),

  setError: (error) => set({ error }),

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const [token, userJson, refreshToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
      ]);

      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        apiService.setAuthToken(token);

        set({
          token,
          user,
          refreshToken: refreshToken || null,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      set({ isLoading: false });
    }
  },
}));

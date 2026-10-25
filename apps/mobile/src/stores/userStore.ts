import { create } from 'zustand';
import { User } from '@/types';
import { apiService } from '@/services/apiService';

interface UserStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  fetchUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get<User>(`/users/${userId}`);
      set({ user: response.data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch user';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateUser: async (userId: string, data: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.put<User>(`/users/${userId}`, data);
      set({ user: response.data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  setUser: (user) => set({ user }),

  setError: (error) => set({ error }),
}));

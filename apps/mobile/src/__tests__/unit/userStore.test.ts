import { useUserStore } from '@/stores/userStore';
import { apiService } from '@/services/apiService';
import { User } from '@/types';

jest.mock('@/services/apiService');

describe('UserStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserStore.getState().setUser(null);
    useUserStore.getState().setError(null);
  });

  describe('fetchUser', () => {
    it('should fetch user data successfully', async () => {
      const mockUser: User = {
        id: 'user-1',
        nombre: 'John Doe',
        email: 'john@example.com',
        empresaId: 'emp-1',
        rol: 'CLIENTE',
        activo: true,
        telefono: '1234567890',
      };

      (apiService.get as jest.Mock).mockResolvedValue({
        data: mockUser,
      });

      await useUserStore.getState().fetchUser('user-1');

      const state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      (apiService.get as jest.Mock).mockRejectedValue(new Error('User not found'));

      await expect(useUserStore.getState().fetchUser('user-1')).rejects.toThrow(
        'User not found',
      );

      const state = useUserStore.getState();
      expect(state.error).toBe('User not found');
      expect(state.user).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      const mockUser: User = {
        id: 'user-1',
        nombre: 'John Doe',
        email: 'john@example.com',
        empresaId: 'emp-1',
        rol: 'CLIENTE',
        activo: true,
      };

      (apiService.get as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: mockUser }), 100);
          }),
      );

      const promise = useUserStore.getState().fetchUser('user-1');

      // Check loading state
      expect(useUserStore.getState().isLoading).toBe(true);

      await promise;

      // Check loading state cleared
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user data successfully', async () => {
      const mockUser: User = {
        id: 'user-1',
        nombre: 'Jane Doe',
        email: 'jane@example.com',
        empresaId: 'emp-1',
        rol: 'CLIENTE',
        activo: true,
        telefono: '9876543210',
      };

      (apiService.put as jest.Mock).mockResolvedValue({
        data: mockUser,
      });

      await useUserStore.getState().updateUser('user-1', { telefono: '9876543210' });

      const state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
    });

    it('should handle update errors', async () => {
      (apiService.put as jest.Mock).mockRejectedValue(new Error('Update failed'));

      await expect(
        useUserStore.getState().updateUser('user-1', { nombre: 'Updated Name' }),
      ).rejects.toThrow('Update failed');

      const state = useUserStore.getState();
      expect(state.error).toBe('Update failed');
    });
  });

  describe('setUser', () => {
    it('should set user data', () => {
      const mockUser: User = {
        id: 'user-1',
        nombre: 'John Doe',
        email: 'john@example.com',
        empresaId: 'emp-1',
        rol: 'CLIENTE',
        activo: true,
      };

      useUserStore.getState().setUser(mockUser);

      expect(useUserStore.getState().user).toEqual(mockUser);
    });

    it('should clear user data', () => {
      useUserStore.getState().setUser(null);

      expect(useUserStore.getState().user).toBeNull();
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      useUserStore.getState().setError('An error occurred');

      expect(useUserStore.getState().error).toBe('An error occurred');
    });

    it('should clear error message', () => {
      useUserStore.getState().setError(null);

      expect(useUserStore.getState().error).toBeNull();
    });
  });
});

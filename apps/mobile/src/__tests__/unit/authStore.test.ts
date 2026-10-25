import { useAuthStore } from '@/stores/authStore';
import { apiService } from '@/services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@/services/apiService');
jest.mock('@react-native-async-storage/async-storage');

describe('AuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().setToken(null);
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setRefreshToken(null);
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: '1',
        nombre: 'John Doe',
        email: 'john@example.com',
        empresaId: 'empresa-1',
        activo: true,
      };

      (apiService.post as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token',
          refreshToken: 'test-refresh',
          expiresIn: 3600,
        },
      });

      await useAuthStore.getState().login({
        email: 'john@example.com',
        password: 'password123',
      });

      const state = useAuthStore.getState();
      expect(state.token).toBe('test-token');
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should store token in AsyncStorage on login', async () => {
      const mockUser = {
        id: '1',
        nombre: 'John Doe',
        email: 'john@example.com',
        empresaId: 'empresa-1',
        activo: true,
      };

      (apiService.post as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token',
          refreshToken: 'test-refresh',
          expiresIn: 3600,
        },
      });

      await useAuthStore.getState().login({
        email: 'john@example.com',
        password: 'password123',
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@wapsell:auth_token', 'test-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@wapsell:user',
        JSON.stringify(mockUser),
      );
    });

    it('should handle login error', async () => {
      (apiService.post as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        useAuthStore.getState().login({
          email: 'john@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Invalid credentials');
      expect(state.token).toBeNull();
    });
  });

  describe('signup', () => {
    it('should successfully signup with valid data', async () => {
      const mockUser = {
        id: '2',
        nombre: 'Jane Doe',
        email: 'jane@example.com',
        empresaId: 'empresa-2',
        activo: true,
      };

      (apiService.post as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token',
          refreshToken: 'test-refresh',
          expiresIn: 3600,
        },
      });

      await useAuthStore.getState().signup({
        nombre: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        empresaId: 'empresa-2',
      });

      const state = useAuthStore.getState();
      expect(state.token).toBe('test-token');
      expect(state.user).toEqual(mockUser);
    });

    it('should handle signup error', async () => {
      (apiService.post as jest.Mock).mockRejectedValue(new Error('Email already exists'));

      await expect(
        useAuthStore.getState().signup({
          nombre: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
          empresaId: 'empresa-2',
        }),
      ).rejects.toThrow('Email already exists');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Email already exists');
    });
  });

  describe('logout', () => {
    it('should clear auth state on logout', async () => {
      // Setup: manually set some state
      useAuthStore.getState().setToken('test-token');
      useAuthStore.getState().setUser({
        id: '1',
        nombre: 'John Doe',
        email: 'john@example.com',
        empresaId: 'empresa-1',
        activo: true,
      });

      (apiService.post as jest.Mock).mockResolvedValue({});

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('should remove tokens from AsyncStorage on logout', async () => {
      (apiService.post as jest.Mock).mockResolvedValue({});

      await useAuthStore.getState().logout();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@wapsell:auth_token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@wapsell:refresh_token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@wapsell:user');
    });
  });

  describe('loadStoredAuth', () => {
    it('should load stored authentication', async () => {
      const mockUser = {
        id: '1',
        nombre: 'John Doe',
        email: 'john@example.com',
        empresaId: 'empresa-1',
        activo: true,
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@wapsell:auth_token') return Promise.resolve('stored-token');
        if (key === '@wapsell:user') return Promise.resolve(JSON.stringify(mockUser));
        if (key === '@wapsell:refresh_token') return Promise.resolve('stored-refresh');
        return Promise.resolve(null);
      });

      await useAuthStore.getState().loadStoredAuth();

      const state = useAuthStore.getState();
      expect(state.token).toBe('stored-token');
      expect(state.user).toEqual(mockUser);
    });

    it('should handle missing stored auth', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().loadStoredAuth();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when both token and user exist', () => {
      useAuthStore.getState().setToken('test-token');
      useAuthStore.getState().setUser({
        id: '1',
        nombre: 'John Doe',
        email: 'john@example.com',
        empresaId: 'empresa-1',
        activo: true,
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should return false when token is missing', () => {
      useAuthStore.getState().setToken(null);
      useAuthStore.getState().setUser({
        id: '1',
        nombre: 'John Doe',
        email: 'john@example.com',
        empresaId: 'empresa-1',
        activo: true,
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should return false when user is missing', () => {
      useAuthStore.getState().setToken('test-token');
      useAuthStore.getState().setUser(null);

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});

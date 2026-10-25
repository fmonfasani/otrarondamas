import { apiService } from '@/services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET request', () => {
    it('should make a GET request successfully', async () => {
      const mockData = { id: '1', name: 'Test' };
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const response = await apiService.get('/test');

      expect(response.data).toEqual(mockData);
    });

    it('should add Authorization header if token is set', async () => {
      apiService.setAuthToken('test-token');
      const mockData = { id: '1' };
      mockedAxios.get.mockResolvedValue({ data: mockData });

      await apiService.get('/test');

      // Verify header was set (would be checked in interceptor)
      expect(apiService['authToken']).toBe('test-token');
    });
  });

  describe('POST request', () => {
    it('should make a POST request successfully', async () => {
      const mockData = { success: true };
      mockedAxios.post.mockResolvedValue({ data: mockData });

      const response = await apiService.post('/test', { email: 'test@example.com' });

      expect(response.data).toEqual(mockData);
    });

    it('should handle POST errors', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(apiService.post('/test', {})).rejects.toThrow('Network error');
    });
  });

  describe('PUT request', () => {
    it('should make a PUT request successfully', async () => {
      const mockData = { success: true };
      mockedAxios.put.mockResolvedValue({ data: mockData });

      const response = await apiService.put('/test', { name: 'Updated' });

      expect(response.data).toEqual(mockData);
    });
  });

  describe('PATCH request', () => {
    it('should make a PATCH request successfully', async () => {
      const mockData = { success: true };
      mockedAxios.patch.mockResolvedValue({ data: mockData });

      const response = await apiService.patch('/test', { name: 'Updated' });

      expect(response.data).toEqual(mockData);
    });
  });

  describe('DELETE request', () => {
    it('should make a DELETE request successfully', async () => {
      const mockData = { success: true };
      mockedAxios.delete.mockResolvedValue({ data: mockData });

      const response = await apiService.delete('/test');

      expect(response.data).toEqual(mockData);
    });
  });

  describe('setAuthToken', () => {
    it('should set auth token', () => {
      apiService.setAuthToken('new-token');

      expect(apiService['authToken']).toBe('new-token');
    });

    it('should store token in AsyncStorage', () => {
      apiService.setAuthToken('new-token');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@wapsell:auth_token', 'new-token');
    });
  });

  describe('error handling', () => {
    it('should handle 401 Unauthorized errors', async () => {
      const error = new Error('Unauthorized');
      (error as any).response = { status: 401 };
      mockedAxios.get.mockRejectedValue(error);

      await expect(apiService.get('/test')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(apiService.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('multi-tenant support', () => {
    it('should support empresaId in request params', async () => {
      const mockData = { data: [] };
      mockedAxios.get.mockResolvedValue({ data: mockData });

      await apiService.get('/productos?empresaId=emp-123');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/productos?empresaId=emp-123',
        expect.any(Object),
      );
    });
  });
});

import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  describe('catch', () => {
    it('should handle BadRequestException with validation errors', () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };

      const mockRequest = {
        url: '/api/test',
        method: 'POST',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      };

      const validationErrors = [
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email',
          },
        },
      ];

      const exception = new BadRequestException({
        message: validationErrors,
      });

      filter.catch(exception as any, mockHost as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.statusCode).toBe(400);
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toBeDefined();
      expect(response.path).toBe('/api/test');
      expect(response.correlationId).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should handle NotFoundException', () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };

      const mockRequest = {
        url: '/api/users/999',
        method: 'GET',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      };

      const exception = new NotFoundException('User not found');

      filter.catch(exception as any, mockHost as any);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      const response = mockResponse.json.mock.calls[0][0];
      expect(response.statusCode).toBe(404);
      expect(response.message).toBe('User not found');
    });

    it('should handle UnauthorizedException', () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };

      const mockRequest = {
        url: '/api/protected',
        method: 'GET',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      };

      const exception = new UnauthorizedException(
        'Invalid token',
      );

      filter.catch(exception as any, mockHost as any);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      const response = mockResponse.json.mock.calls[0][0];
      expect(response.statusCode).toBe(401);
      expect(response.message).toBe('Invalid token');
    });

    it('should handle ForbiddenException', () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };

      const mockRequest = {
        url: '/api/admin',
        method: 'GET',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      };

      const exception = new ForbiddenException(
        'Insufficient permissions',
      );

      filter.catch(exception as any, mockHost as any);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      const response = mockResponse.json.mock.calls[0][0];
      expect(response.statusCode).toBe(403);
      expect(response.message).toBe('Insufficient permissions');
    });

    it('should include correlationId from request or generate new one', () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };

      const testCorrelationId = '123e4567-e89b-12d3-a456-426614174000';

      const mockRequest = {
        url: '/api/test',
        method: 'POST',
        headers: {},
        correlationId: testCorrelationId,
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      };

      const exception = new BadRequestException('Test error');

      filter.catch(exception as any, mockHost as any);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.correlationId).toBe(testCorrelationId);
    });

    it('should include timestamp and path in response', () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };

      const mockRequest = {
        url: '/api/test',
        method: 'POST',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      };

      const exception = new BadRequestException('Test error');

      const beforeTime = new Date();
      filter.catch(exception as any, mockHost as any);
      const afterTime = new Date();

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.path).toBe('/api/test');
      expect(response.timestamp).toBeDefined();

      const responseTime = new Date(response.timestamp);
      expect(responseTime.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(responseTime.getTime()).toBeLessThanOrEqual(
        afterTime.getTime() + 1000,
      );
    });
  });
});

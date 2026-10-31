import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('AuthService - JWT Auth', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrisma = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    empresa: {
      create: jest.fn(),
    },
    userEmpresa: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    decode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user with valid input', async () => {
      const email = 'test@example.com';
      const password = 'ValidPass123';
      const nombre = 'Test User';
      const companyName = 'Test Company';

      const mockEmpresa = {
        id: 'empresa-1',
        nombre: companyName,
        slug: expect.any(String),
        configuracion: { theme: 'default', language: 'es' },
      };

      const mockUser = {
        id: 'user-1',
        email,
        nombre,
        passwordHash: expect.any(String),
        empresaId: 'empresa-1',
        rol: 'OWNER',
        activo: true,
        estadoLegajo: 'APROBADO',
        UsuarioPermiso: [],
        Empresa: mockEmpresa,
        UserEmpresa: [
          {
            usuarioId: 'user-1',
            empresaId: 'empresa-1',
            role: 'owner',
            Empresa: mockEmpresa,
          },
        ],
        fotoUrl: null,
        googleId: null,
        createdAt: new Date(),
      };

      mock any.findUnique.mockResolvedValue(null);
      mock any.create.mockResolvedValue(mockEmpresa);
      mock any.create.mockResolvedValue(mockUser);
      mock any.create.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValue('jwt-token-123');

      const result = await service.register(email, password, nombre, companyName);

      expect(mock any.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mock any.create).toHaveBeenCalled();
      expect(mock any.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('jwt-token-123');
      expect(result.usuario.email).toBe(email);
      expect(result.usuario.nombre).toBe(nombre);
    });

    it('should reject if email already exists', async () => {
      mock any.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.register('test@example.com', 'ValidPass123', 'User', 'Company'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject password shorter than 8 characters', async () => {
      mock any.findUnique.mockResolvedValue(null);

      await expect(
        service.register('test@example.com', 'Short1', 'User', 'Company'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password without uppercase letter', async () => {
      mock any.findUnique.mockResolvedValue(null);

      await expect(
        service.register('test@example.com', 'lowercase123', 'User', 'Company'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password without lowercase letter', async () => {
      mock any.findUnique.mockResolvedValue(null);

      await expect(
        service.register('test@example.com', 'UPPERCASE123', 'User', 'Company'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password without number', async () => {
      mock any.findUnique.mockResolvedValue(null);

      await expect(
        service.register('test@example.com', 'NoNumbers', 'User', 'Company'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should hash password with bcrypt before storing', async () => {
      const email = 'test@example.com';
      const password = 'ValidPass123';

      const mockEmpresa = { id: 'empresa-1' };
      const mockUser = {
        id: 'user-1',
        email,
        passwordHash: expect.any(String),
        UsuarioPermiso: [],
        Empresa: mockEmpresa,
        UserEmpresa: [],
      };

      mock any.findUnique.mockResolvedValue(null);
      mock any.create.mockResolvedValue(mockEmpresa);
      mock any.create.mockResolvedValue(mockUser);
      mock any.create.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      await service.register(email, password, 'User', 'Company');

      const createCall = mock any.create.mock.calls[0];
      const hashInDb = createCall[0].data.passwordHash;

      // Verify the hash is not the plaintext password
      expect(hashInDb).not.toBe(password);
      // Verify it looks like a bcrypt hash (starts with $2)
      expect(hashInDb).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('logout', () => {
    it('should return success message on valid token', async () => {
      const token = 'valid-jwt-token';
      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      mockJwtService.decode.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        exp: expiresAt,
      });

      const result = await service.logout(token);

      expect(result.message).toBe('Logged out successfully');
      expect(mockJwtService.decode).toHaveBeenCalledWith(token);
    });

    it('should reject invalid token', async () => {
      const token = 'invalid-token';

      mockJwtService.decode.mockReturnValue(null);

      await expect(service.logout(token)).rejects.toThrow();
    });

    it('should reject token with missing exp claim', async () => {
      const token = 'token-without-exp';

      mockJwtService.decode.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        // no exp field
      });

      await expect(service.logout(token)).rejects.toThrow();
    });
  });
});

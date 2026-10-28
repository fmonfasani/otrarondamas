import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * E2E Test Helper Service
 *
 * Provides utilities to setup test data for E2E tests.
 */
@Injectable()
export class TestService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  /**
   * Setup a test user with a business
   */
  async setupUser(data: {
    email: string;
    password: string;
    fullName?: string;
  }) {
    const hashedPassword = await bcryptjs.hash(data.password, 10);
    const userId = uuidv4();
    const businessId = uuidv4();

    // Create user
    const user = await this.prisma.usuario.create({
      data: {
        id: userId,
        email: data.email,
        password: hashedPassword,
        nombre_completo: data.fullName || 'Test User',
        estado: 'activo',
      },
    });

    // Create business
    const business = await this.prisma.negocio.create({
      data: {
        id: businessId,
        nombre: `Test Business ${Date.now()}`,
        descripcion: 'Test business for E2E',
        propietarioId: userId,
        estado: 'activo',
      },
    });

    // Create relationship
    await this.prisma.negocioUsuario.create({
      data: {
        negocioId: businessId,
        usuarioId: userId,
        rol: 'propietario',
      },
    });

    // Generate JWT
    const token = this.jwtService.sign({
      sub: userId,
      email: user.email,
      businessId,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
      businesses: [businessId],
    };
  }

  /**
   * Setup a test user with multiple businesses
   */
  async setupUserWithMultipleBusinesses(
    email: string,
    password: string,
    businessCount: number = 2
  ) {
    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = uuidv4();
    const businessIds: string[] = [];

    // Create user
    const user = await this.prisma.usuario.create({
      data: {
        id: userId,
        email,
        password: hashedPassword,
        nombre_completo: 'Test User Multi',
        estado: 'activo',
      },
    });

    // Create multiple businesses
    for (let i = 0; i < businessCount; i++) {
      const businessId = uuidv4();
      businessIds.push(businessId);

      await this.prisma.negocio.create({
        data: {
          id: businessId,
          nombre: `Test Business ${i + 1} ${Date.now()}`,
          descripcion: `Test business ${i + 1}`,
          propietarioId: userId,
          estado: 'activo',
        },
      });

      await this.prisma.negocioUsuario.create({
        data: {
          negocioId: businessId,
          usuarioId: userId,
          rol: 'propietario',
        },
      });
    }

    // Generate JWT with first business
    const token = this.jwtService.sign({
      sub: userId,
      email: user.email,
      businessId: businessIds[0],
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
      businesses: businessIds,
    };
  }

  /**
   * Get reset token for password reset testing
   */
  async getResetToken(email: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // In a real implementation, this would generate and store a reset token
    // For E2E testing, we generate a valid JWT with reset scope
    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        scope: 'password-reset',
      },
      {
        expiresIn: '1h',
      }
    );

    return { token: resetToken };
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    // Delete all test users and related data
    const result = await this.prisma.usuario.deleteMany({
      where: {
        email: {
          contains: 'test-',
        },
      },
    });

    return {
      deletedUsers: result.count,
    };
  }
}

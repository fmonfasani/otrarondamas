import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';

@Injectable()
export class PermissionAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions() {
    const capabilities = await this.prisma.capabilityDefinition.findMany({
      orderBy: { category: 'asc' },
    });

    const grouped = capabilities.reduce(
      (acc, cap) => {
        const category = cap.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          id: cap.id,
          code: cap.code,
          description: cap.description,
          category: cap.category,
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );

    return grouped;
  }

  async createRole(businessId: string, dto: CreateRoleDto) {
    // Check if role name already exists
    const existingRole = await this.prisma.roleTemplate.findUnique({
      where: { name: dto.name },
    });
    if (existingRole) {
      throw new BadRequestException('Role name already exists');
    }

    // Verify all capabilities exist
    const capabilities = await this.prisma.capabilityDefinition.findMany({
      where: { id: { in: dto.capabilityIds } },
    });
    if (capabilities.length !== dto.capabilityIds.length) {
      throw new BadRequestException('One or more capability IDs are invalid');
    }

    // Create role with capabilities
    const role = await this.prisma.roleTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        empresaId: businessId,
        RoleCapability: {
          create: dto.capabilityIds.map((capId) => ({
            capabilityDefId: capId,
          })),
        },
      },
      include: {
        RoleCapability: {
          include: { capabilityDefinition: true },
        },
      },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isGlobal: role.empresaId === null,
      capabilities: role.RoleCapability.map((rc) => ({
        id: rc.capabilityDefinition.id,
        code: rc.capabilityDefinition.code,
        description: rc.capabilityDefinition.description,
        category: rc.capabilityDefinition.category,
      })),
    };
  }

  async updateRole(businessId: string, roleId: string, dto: any) {
    // Verify role exists and belongs to this business
    const role = await this.prisma.roleTemplate.findUnique({
      where: { id: roleId },
      include: {
        RoleCapability: {
          include: { capabilityDefinition: true },
        },
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.empresaId && role.empresaId !== businessId) {
      throw new BadRequestException('Cannot modify role from another business');
    }

    // Verify all new capabilities exist
    if (dto.capabilityIds) {
      const capabilities = await this.prisma.capabilityDefinition.findMany({
        where: { id: { in: dto.capabilityIds } },
      });
      if (capabilities.length !== dto.capabilityIds.length) {
        throw new BadRequestException('One or more capability IDs are invalid');
      }
    }

    // Update role
    const updated = await this.prisma.roleTemplate.update({
      where: { id: roleId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description && { description: dto.description }),
        ...(dto.capabilityIds && {
          RoleCapability: {
            deleteMany: { roleTemplateId: roleId },
            create: dto.capabilityIds.map((capId: string) => ({
              capabilityDefId: capId,
            })),
          },
        }),
      },
      include: {
        RoleCapability: {
          include: { capabilityDefinition: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isGlobal: updated.empresaId === null,
      capabilities: updated.RoleCapability.map((rc) => ({
        id: rc.capabilityDefinition.id,
        code: rc.capabilityDefinition.code,
        description: rc.capabilityDefinition.description,
        category: rc.capabilityDefinition.category,
      })),
    };
  }

  async listRolesByBusiness(businessId: string) {
    const roles = await this.prisma.roleTemplate.findMany({
      where: {
        OR: [{ empresaId: businessId }, { empresaId: null }],
      },
      include: {
        RoleCapability: {
          include: { capabilityDefinition: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isGlobal: role.empresaId === null,
      capabilities: role.RoleCapability.map((rc) => ({
        id: rc.capabilityDefinition.id,
        code: rc.capabilityDefinition.code,
        description: rc.capabilityDefinition.description,
        category: rc.capabilityDefinition.category,
      })),
    }));
  }

  async assignRoleToUser(businessId: string, userId: string, roleTemplateId: string) {
    // Verify user has membership in this business
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this business');
    }

    // Verify role exists
    const role = await this.prisma.roleTemplate.findUnique({
      where: { id: roleTemplateId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Assign or update role grant
    const existingGrant = await this.prisma.roleGrant.findUnique({
      where: { membershipId: membership.id },
    });

    if (existingGrant) {
      await this.prisma.roleGrant.update({
        where: { id: existingGrant.id },
        data: { roleTemplateId },
      });
    } else {
      await this.prisma.roleGrant.create({
        data: {
          membershipId: membership.id,
          roleTemplateId,
        },
      });
    }
  }

  async removeRoleFromUser(businessId: string, userId: string) {
    // Verify user has membership in this business
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: { userId, businessId },
      },
      include: { roleGrant: true },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this business');
    }

    if (!membership.roleGrant) {
      throw new BadRequestException('User has no role assigned');
    }

    await this.prisma.roleGrant.delete({
      where: { id: membership.roleGrant.id },
    });
  }
}

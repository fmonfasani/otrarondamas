import { MembershipStatus, RolUsuario } from '@prisma/client'; // TODO: types

export class CapabilityGrantDto {
  id: string;
  code: string;
  description?: string;
  category?: string;
}

export class RoleGrantDto {
  id: string;
  roleTemplateId: string;
  roleName: string;
  capabilities: CapabilityGrantDto[];
}

export class UserAdminResponseDto {
  id: string;
  email: string;
  nombre: string;
  fotoUrl?: string;
  membership: {
    businessId: string;
    businessName: string;
    role: RolUsuario;
    status: MembershipStatus;
    createdAt: Date;
  };
  roleGrant?: RoleGrantDto;
  createdAt: Date;
  updatedAt: Date;
}

export class ListUsersAdminResponseDto {
  id: string;
  email: string;
  nombre: string;
  fotoUrl?: string;
  membership: {
    businessId: string;
    role: RolUsuario;
    status: MembershipStatus;
  };
  roleTemplateId?: string;
  createdAt: Date;
}

export class ListUsersAdminDto {
  data: ListUsersAdminResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

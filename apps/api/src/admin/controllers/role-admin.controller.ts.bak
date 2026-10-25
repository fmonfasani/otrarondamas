import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../auth/guards/authorization.guard';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PermissionAdminService } from '../services/permission-admin.service';
import { CreateRoleDto } from '../dto/create-role.dto';

@Controller('admin/roles')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class RoleAdminController {
  constructor(private readonly permissionService: PermissionAdminService) {}

  @Get()
  @Authorize('roles.manage')
  async listRoles(@CurrentUser() user: any) {
    return this.permissionService.listRolesByBusiness(user.empresaId);
  }

  @Post()
  @Authorize('roles.manage')
  @HttpCode(201)
  async createRole(@CurrentUser() user: any, @Body() dto: CreateRoleDto) {
    return this.permissionService.createRole(user.empresaId, dto);
  }

  @Patch(':roleId')
  @Authorize('roles.manage')
  async updateRole(
    @CurrentUser() user: any,
    @Param('roleId') roleId: string,
    @Body() dto: any,
  ) {
    return this.permissionService.updateRole(user.empresaId, roleId, dto);
  }

  @Get('permissions')
  @Authorize('roles.manage')
  async listPermissions() {
    return this.permissionService.listPermissions();
  }

  @Get(':roleId/capabilities')
  @Authorize('roles.manage')
  async getRoleCapabilities(
    @CurrentUser() user: any,
    @Param('roleId') roleId: string,
  ) {
    const roles = await this.permissionService.listRolesByBusiness(user.empresaId);
    const role = roles.find((r) => r.id === roleId);
    if (!role) {
      return { error: 'Role not found' };
    }
    return role.capabilities;
  }
}

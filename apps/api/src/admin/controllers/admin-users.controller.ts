import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../auth/guards/authorization.guard';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserAdminService } from '../services/user-admin.service';
import { CreateUserAdminDto } from '../dto/create-user-admin.dto';
import { UpdateUserAdminDto } from '../dto/update-user-admin.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class AdminUsersController {
  constructor(private readonly userAdminService: UserAdminService) {}

  @Get()
  @Authorize('users.manage')
  async listUsers(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 25;

    if (isNaN(pageNum) || isNaN(limitNum)) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    return this.userAdminService.listUsers(user.empresaId, pageNum, limitNum, role, status);
  }

  @Get(':userId')
  @Authorize('users.manage')
  async getUserDetail(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.userAdminService.getUserDetail(user.empresaId, userId);
  }

  @Post()
  @Authorize('users.manage')
  @HttpCode(201)
  async createUser(@CurrentUser() user: any, @Body() dto: CreateUserAdminDto) {
    return this.userAdminService.createUser(user.empresaId, dto);
  }

  @Patch(':userId')
  @Authorize('users.manage')
  async updateUser(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserAdminDto,
  ) {
    return this.userAdminService.updateUser(user.empresaId, userId, dto);
  }

  @Delete(':userId')
  @Authorize('users.manage')
  @HttpCode(204)
  async deactivateUser(@CurrentUser() user: any, @Param('userId') userId: string) {
    await this.userAdminService.deactivateUser(user.empresaId, userId);
  }

  @Post(':userId/reset-password')
  @Authorize('users.manage')
  async resetPassword(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.userAdminService.resetPassword(user.empresaId, userId);
  }

  @Get(':userId/roles')
  @Authorize('users.manage')
  async getRolesByBusiness(@CurrentUser() user: any) {
    return this.userAdminService.getRolesByBusiness(user.empresaId);
  }

  @Patch(':userId/roles/:roleId')
  @Authorize('users.manage')
  async assignRole(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.userAdminService.assignRoleToUser(user.empresaId, userId, roleId);
  }

  @Delete(':userId/roles/:roleId')
  @Authorize('users.manage')
  @HttpCode(204)
  async removeRole(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.userAdminService.removeRoleFromUser(user.empresaId, userId);
  }
}

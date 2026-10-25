import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminUsersController } from './controllers/admin-users.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { RoleAdminController } from './controllers/role-admin.controller';
import { AuditAdminController } from './controllers/audit-admin.controller';
import { UserAdminService } from './services/user-admin.service';
import { AnalyticsDashboardService } from './services/analytics-dashboard.service';
import { PermissionAdminService } from './services/permission-admin.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [
    AdminUsersController,
    DashboardController,
    RoleAdminController,
    AuditAdminController,
  ],
  providers: [
    UserAdminService,
    AnalyticsDashboardService,
    PermissionAdminService,
  ],
  exports: [
    UserAdminService,
    AnalyticsDashboardService,
    PermissionAdminService,
  ],
})
export class AdminModule {}

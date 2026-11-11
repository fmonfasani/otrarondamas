import { Controller, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MembershipRevocationService } from './membership-revocation.service';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';

@ApiTags('memberships')
@ApiBearerAuth()
@Controller('memberships')
export class MembershipController {
  constructor(private readonly membershipRevocation: MembershipRevocationService) {}

  @CanonicalPermission('USERS_MANAGE')
  @Patch(':membershipId/suspend')
  suspend(@Param('membershipId') membershipId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipRevocation.suspendMembership(user, membershipId);
  }

  @CanonicalPermission('USERS_MANAGE')
  @Patch(':membershipId/reactivate')
  reactivate(@Param('membershipId') membershipId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipRevocation.reactivateMembership(user, membershipId);
  }
}

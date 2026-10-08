import { Controller, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MembershipRevocationService } from './membership-revocation.service';

@ApiTags('memberships')
@ApiBearerAuth()
@Controller('memberships')
export class MembershipController {
  constructor(private readonly membershipRevocation: MembershipRevocationService) {}

  @Patch(':membershipId/suspend')
  suspend(@Param('membershipId') membershipId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipRevocation.suspendMembership(user, membershipId);
  }

  @Patch(':membershipId/reactivate')
  reactivate(@Param('membershipId') membershipId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipRevocation.reactivateMembership(user, membershipId);
  }
}

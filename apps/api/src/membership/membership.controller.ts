import { Controller, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MembershipService } from './membership.service';

@ApiTags('memberships')
@ApiBearerAuth()
@Controller('memberships')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Patch(':membershipId/suspend')
  suspend(@Param('membershipId') membershipId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipService.suspendMembership(user, membershipId);
  }

  @Patch(':membershipId/reactivate')
  reactivate(@Param('membershipId') membershipId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipService.reactivateMembership(user, membershipId);
  }
}

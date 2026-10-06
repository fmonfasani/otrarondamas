import { PartialType } from '@nestjs/swagger';
import { CreateLoyaltyRuleDto } from './create-loyalty-rule.dto';

export class UpdateLoyaltyRuleDto extends PartialType(CreateLoyaltyRuleDto) {}

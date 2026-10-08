import { IsOptional, IsUUID } from 'class-validator';

export class AddParticipantDto {
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @IsOptional()
  @IsUUID('4')
  customerId?: string;
}

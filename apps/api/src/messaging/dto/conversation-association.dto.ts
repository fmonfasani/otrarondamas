// import { MessagingAssociationType } from '@prisma/client'; // TODO: types
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateConversationAssociationDto {
  @IsEnum(MessagingAssociationType)
  entityType!: MessagingAssociationType;

  @IsUUID()
  entityId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class DeactivateConversationAssociationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

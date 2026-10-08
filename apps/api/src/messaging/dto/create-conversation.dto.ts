import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ArrayUnique, IsUUID } from 'class-validator';

export enum ConversationTypeDto {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

export class CreateConversationDto {
  @IsEnum(ConversationTypeDto)
  type!: ConversationTypeDto;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @Type(() => String)
  participantUserIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @Type(() => String)
  participantCustomerIds?: string[];
}

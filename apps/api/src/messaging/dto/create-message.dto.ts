import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  clientMessageId!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsUUID('4')
  @Type(() => String)
  replyToMessageId?: string;
}

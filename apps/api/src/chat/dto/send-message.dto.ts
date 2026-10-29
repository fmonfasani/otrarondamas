import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsUUID()
  session_id?: string;

  @IsOptional()
  user_context?: Record<string, unknown>;
}

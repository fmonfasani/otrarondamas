import { IsString, MaxLength, MinLength } from 'class-validator';

/** STORE-V1-04 — a text message from a store customer. */
export class CustomerMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  clientMessageId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/* eslint-disable indent */

/** OR-B4-037 — the form fields that come with a photo or PDF. */
export class ChatFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  clientMessageId: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caption?: string;
}

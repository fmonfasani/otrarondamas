import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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

  /** E5 — «1» when it comes from the microphone button: a voice note. */
  @IsOptional()
  @IsIn(['1'])
  voz?: string;

  /** E5 — the voice note's length in whole seconds, as the recorder measured it. */
  @IsOptional()
  @Matches(/^\d{1,4}$/)
  duracion?: string;
}

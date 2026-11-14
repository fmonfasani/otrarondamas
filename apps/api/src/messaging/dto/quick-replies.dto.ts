import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/* eslint-disable indent */

export class QuickReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  titulo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  texto: string;
}

/** OR-B4-037 — the Business's whole list of quick replies (replaces the previous one). */
export class QuickRepliesDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuickReplyDto)
  items: QuickReplyDto[];
}

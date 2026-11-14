import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

/* eslint-disable indent */

/** OR-B4-037 — share a catalogue product as a card in the conversation. */
export class ShareProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  clientMessageId: string;

  @IsUUID()
  productoId: string;
}

/** OR-B4-037 — how many units of a product the customer's cart holds (0 removes it). */
export class ConversationCartItemDto {
  @IsUUID()
  productoId: string;

  @IsInt()
  @Min(0)
  @Max(9999)
  cantidad: number;
}

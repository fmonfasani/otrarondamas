import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

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

  /** E4 — answering one message of the chat (it shows quoted above). */
  @IsOptional()
  @IsUUID('4')
  replyToMessageId?: string;
}

/** E4 — the customer edits a message they wrote (for 15 minutes). */
export class CustomerEditMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

/** E6b «+ Productos» — a product of the store the customer asks about. */
export class CustomerProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  clientMessageId: string;

  @IsUUID()
  productoId: string;
}

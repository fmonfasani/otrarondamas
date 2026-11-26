import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EditMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}

export class ReactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emoji!: string;
}

/** E4 — «Reenviar» a message to up to five chats of the Business. */
export class ForwardMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  clientMessageId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsUUID('4', { each: true })
  conversationIds!: string[];
}

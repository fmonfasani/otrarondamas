import { IsBoolean, IsUUID } from 'class-validator';

export class MarkMessageReadDto {
  @IsUUID()
  messageId!: string;
}

export class ReadReceiptPreferenceDto {
  @IsBoolean()
  enabled!: boolean;
}

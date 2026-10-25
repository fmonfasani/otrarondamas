import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RefundReasonEnum {
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  MISTAKE = 'MISTAKE',
  FRAUD_SUSPECTED = 'FRAUD_SUSPECTED',
  OTHER = 'OTHER',
}

export class RefundDto {
  @ApiProperty({ description: 'Amount in cents' })
  @IsNumber()
  monto: number;

  @ApiProperty({ enum: RefundReasonEnum })
  @IsEnum(RefundReasonEnum)
  razon: RefundReasonEnum;

  @ApiProperty({ required: false, description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notas?: string;
}

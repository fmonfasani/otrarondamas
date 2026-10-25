import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty({ description: 'Client secret from PaymentIntent' })
  @IsString()
  clientSecret: string;

  @ApiProperty({ required: false, description: 'Stripe payment token' })
  @IsString()
  @IsOptional()
  stripeToken?: string;

  @ApiProperty({ required: false, description: 'Last 4 digits of card' })
  @IsString()
  @IsOptional()
  ultimosDigitos?: string;

  @ApiProperty({ required: false, description: 'Payment method (CARD, BANK_TRANSFER, etc)' })
  @IsString()
  @IsOptional()
  metodo?: string;
}

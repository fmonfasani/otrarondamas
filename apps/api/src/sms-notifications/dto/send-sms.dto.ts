import { IsString, IsPhoneNumber, Length, IsNotEmpty } from 'class-validator';

/**
 * DTO for sending an SMS message.
 *
 * Supports both formatted phone numbers (+54 9 11 1234 5678) and E.164 format.
 * The service normalizes to E.164 before sending to Twilio.
 */
export class SendSMSDto {
  @IsNotEmpty({ message: 'El número de teléfono es requerido' })
  @IsString()
  phoneNumber: string; // Can be any format; normalized internally

  @IsNotEmpty({ message: 'El mensaje es requerido' })
  @IsString()
  @Length(1, 160, { message: 'El mensaje debe tener entre 1 y 160 caracteres' })
  message: string;

  @IsString()
  type?: 'otp' | 'alert' | 'transactional' = 'transactional';
}

/**
 * DTO for sending OTP (One-Time Password).
 */
export class SendOTPDto {
  @IsNotEmpty({ message: 'El número de teléfono es requerido' })
  @IsString()
  phoneNumber: string;

  @IsString()
  purpose: 'LOGIN' | 'PAYMENT' | 'ACCOUNT_VERIFICATION' | 'PASSWORD_RESET' = 'LOGIN';
}

/**
 * DTO for verifying OTP.
 */
export class VerifyOTPDto {
  @IsNotEmpty({ message: 'El número de teléfono es requerido' })
  @IsString()
  phoneNumber: string;

  @IsNotEmpty({ message: 'El código OTP es requerido' })
  @IsString()
  @Length(6, 6, { message: 'El código OTP debe tener exactamente 6 dígitos' })
  code: string;

  @IsString()
  purpose: 'LOGIN' | 'PAYMENT' | 'ACCOUNT_VERIFICATION' | 'PASSWORD_RESET' = 'LOGIN';
}

/**
 * DTO for adding/updating phone number.
 */
export class UpdatePhoneNumberDto {
  @IsNotEmpty({ message: 'El número de teléfono es requerido' })
  @IsString()
  phoneNumber: string;

  @IsString()
  isPrimary?: boolean;
}

/**
 * DTO for SMS bulk send (admin only).
 */
export class SendBulkSMSDto {
  @IsNotEmpty({ message: 'Los números de teléfono son requeridos' })
  phoneNumbers: string[];

  @IsNotEmpty({ message: 'El mensaje es requerido' })
  @IsString()
  @Length(1, 160, { message: 'El mensaje debe tener entre 1 y 160 caracteres' })
  message: string;
}

/**
 * DTO for creating SMS alerts.
 */
export class CreateSMSAlertDto {
  @IsNotEmpty({ message: 'El trigger es requerido' })
  @IsString()
  trigger: string; // "order_confirmation", "inventory_low", "payment_received"

  @IsNotEmpty({ message: 'El mensaje es requerido' })
  @IsString()
  message: string;

  phoneNumberId?: string; // If not provided, uses primary phone
}

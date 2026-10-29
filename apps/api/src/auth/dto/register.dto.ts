import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase letters, lowercase letters, and numbers',
  })
  password: string;

  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @MinLength(1)
  companyName: string;
}

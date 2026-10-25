import { IsEmail, IsNotEmpty, IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { RolUsuario } from '@prisma/client';

export class CreateUserAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsUUID()
  roleTemplateId: string;

  @IsOptional()
  @IsString()
  fotoUrl?: string;
}

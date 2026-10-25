import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  capabilityIds: string[];
}

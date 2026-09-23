import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CrearPagoProveedorDto {
  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsString()
  @IsNotEmpty()
  medioPago: string; // Transferencia, Efectivo, Cheque, etc.

  @IsString()
  @IsOptional()
  referencia?: string;

  @IsString()
  @IsOptional()
  notas?: string;
}

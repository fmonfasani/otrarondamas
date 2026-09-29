import { PartialType } from '@nestjs/swagger';
import { CreateReglaFidelizacionDto } from './create-regla-fidelizacion.dto';

export class UpdateReglaFidelizacionDto extends PartialType(CreateReglaFidelizacionDto) {}

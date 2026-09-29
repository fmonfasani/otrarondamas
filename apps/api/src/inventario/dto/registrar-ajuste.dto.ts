import { IsInt, IsNotEmpty, IsString, IsUUID, NotEquals } from 'class-validator';

/* eslint-disable indent -- falso positivo conocido de la regla `indent`
   base de ESLint con decorators de TypeScript en propiedades de clase
   (no entiende `@Decorator()` antes de una propiedad) — mismo patrón ya
   usado en el resto de los DTOs del proyecto (ver caja/dto,
   ventas/dto/create-venta.dto.ts, auth/dto/login.dto.ts). */

// INV-AJ-01: el ajuste es sobre un lote concreto, elegido por el usuario
// (no un lote que el sistema resuelva automáticamente, a diferencia de
// VentasService.descontarStock() que sí hace esa resolución vía FIFO —
// acá el caso de uso es "conté físicamente y este lote específico tiene
// una diferencia", así que el lote es un dato de entrada, no algo a
// inferir).
export class RegistrarAjusteDto {
  @IsUUID()
  loteId: string;

  // Variación, no total resultante: positiva suma stock, negativa lo
  // resta. 0 se rechaza explícitamente (@NotEquals): un ajuste que no
  // cambia nada no tiene sentido como operación.
  @IsInt()
  @NotEquals(0)
  cantidad: number;

  // Motivo obligatorio y de texto libre auditable (INV-AJ-01) — no un
  // enum cerrado como en caja (Ingreso/Egreso/Gasto/Retiro), porque el
  // motivo real de un ajuste ("conteo físico", "producto dañado", "error
  // de carga inicial") no está catalogado todavía y no corresponde
  // inventar una taxonomía sin que el dueño la confirme.
  @IsString()
  @IsNotEmpty()
  motivo: string;
}

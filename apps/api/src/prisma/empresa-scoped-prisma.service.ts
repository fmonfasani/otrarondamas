import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { empresaScopeExtension } from './empresa-scope.extension';

/**
 * Fábrica de clientes de Prisma con el filtro de aislamiento
 * multiempresa (INV-01) ya aplicado. Provider normal (singleton, NO
 * Scope.REQUEST).
 *
 * Historial: la primera versión de este service usaba
 * `@Injectable({ scope: Scope.REQUEST })` + `@Inject(REQUEST)` para leer
 * el empresaId directo de `request.user` en el constructor. Se descartó
 * porque, probando contra el servidor real, se confirmó que NestJS
 * resuelve un provider Scope.REQUEST (y por lo tanto instancia el
 * controller que lo inyecta) en un punto del ciclo de vida que puede
 * preceder a la ejecución de los guards — incluso guards registrados
 * como APP_GUARD global. El síntoma reproducido: una request SIN token
 * llegaba a construir el service en vez de ser cortada por
 * JwtAuthGuard. No es una suposición: se verificó con logs de servidor
 * real antes de descartar el patrón.
 *
 * El reemplazo evita el problema por diseño: no depende de que Nest
 * resuelva nada especial por request. El caller (un controller, después
 * de que el guard ya corrió) le pasa el empresaId explícitamente, leído
 * de @CurrentUser().
 *
 * Uso en un controller:
 *   constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}
 *   getProducto(@CurrentUser() user: AuthenticatedUser) {
 *     const db = this.prismaFactory.forEmpresa(user.empresaId);
 *     return db.producto.findMany(); // ya viene filtrado por empresaId
 *   }
 */
@Injectable()
export class EmpresaScopedPrismaService {
  constructor(private readonly prisma: PrismaService) {}

  forEmpresa(empresaId: string) {
    return this.prisma.$extends(empresaScopeExtension(empresaId));
  }
}

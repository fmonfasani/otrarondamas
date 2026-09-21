import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { VentasModule } from './ventas/ventas.module';
import { PagosModule } from './pagos/pagos.module';
import { CajaModule } from './caja/caja.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { InventarioModule } from './inventario/inventario.module';
import { ComprasModule } from './compras/compras.module';
import { AutorizacionesModule } from './autorizaciones/autorizaciones.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CatalogoModule,
    VentasModule,
    PagosModule,
    CajaModule,
    UsuariosModule,
    InventarioModule,
    ComprasModule,
    AutorizacionesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guards globales, en este orden: primero autenticación (puebla
    // request.user desde el JWT), después autorización por permiso
    // (@RequierePermiso, lee request.user ya poblado). Ver el comentario
    // en jwt-auth.guard.ts sobre por qué esto tiene que ser global y no
    // @UseGuards por-controller.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}

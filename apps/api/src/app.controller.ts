import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { RequierePermiso } from './auth/decorators/requiere-permiso.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Endpoint de verificación del guard de permisos (sin lógica de negocio
   * real): confirma que un usuario sin 'caja.gastos' recibe 403 y uno con
   * el permiso recibe 200. No es el módulo de caja — eso es un incremento
   * aparte. Los guards (auth + permisos) son globales, ver app.module.ts.
   */
  @ApiBearerAuth()
  @RequierePermiso('caja.gastos')
  @Get('protegido/caja-gastos')
  checkCajaGastos(): { ok: true } {
    return { ok: true };
  }
}

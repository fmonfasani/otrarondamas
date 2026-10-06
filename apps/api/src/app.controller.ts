import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { RequirePermission } from './auth/decorators/require-permission.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Permission guard verification endpoint (no real business logic):
   * confirms that a user without 'caja.gastos' gets 403 and one with the
   * permission gets 200. It is not the cash register module — that is a
   * separate increment. The guards (auth + permissions) are global, see
   * app.module.ts.
   */
  @ApiBearerAuth()
  @RequirePermission('caja.gastos')
  @Get('protegido/caja-gastos')
  checkCashRegisterExpenses(): { ok: true } {
    return { ok: true };
  }
}

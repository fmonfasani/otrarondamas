import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ExplorerService } from './explorer.service';

/**
 * Marketplace, step 2 — GET /explorar: what Wapsell's explorer shows (stores that chose to
 * appear, rubros, carousels). Public like a store's window: anyone can look; buying and
 * chatting need an account.
 */
@Controller('explorar')
export class ExplorerController {
  constructor(private readonly explorer: ExplorerService) {}

  @Public()
  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  explore() {
    return this.explorer.explore();
  }
}

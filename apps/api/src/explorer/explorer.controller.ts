import { Controller, Get, Header, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ExplorerService } from './explorer.service';
import { SearchExplorerDto } from './dto/search-explorer.dto';

/**
 * Marketplace — Wapsell's explorer and its search. Public like a store's window: anyone can look;
 * buying and chatting need an account.
 */
@Controller('explorar')
export class ExplorerController {
  constructor(private readonly explorer: ExplorerService) {}

  /** GET /explorar — stores that chose to appear, rubros and carousels (step 2). */
  @Public()
  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  explore() {
    return this.explorer.explore();
  }

  /** GET /explorar/buscar — products of every store and the stores found, with filters (step 3). */
  @Public()
  @Get('buscar')
  @Header('Cache-Control', 'public, max-age=60')
  search(@Query() query: SearchExplorerDto) {
    return this.explorer.search({
      q: query.q,
      rubro: query.rubro,
      marcas: query.marca,
      min: query.min,
      max: query.max,
      enOferta: Boolean(query.oferta),
      abierto: Boolean(query.abierto),
      orden: query.orden,
      pagina: query.pagina,
    });
  }

  /** GET /explorar/sugerencias?q= — while the customer types (from two letters). */
  @Public()
  @Get('sugerencias')
  @Header('Cache-Control', 'public, max-age=60')
  suggestions(@Query('q') q?: string) {
    return this.explorer.suggestions(String(q ?? '').slice(0, 100));
  }
}

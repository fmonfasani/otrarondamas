import {
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CompradorService } from '../auth/comprador/comprador.service';
import { FavoritesService } from './favorites.service';

const bearer = (header: string | undefined) => {
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new UnauthorizedException('Ingresá con tu cuenta.');
  return token;
};

/**
 * Marketplace, step 3b — the buyer's ♥ products. Buyer sessions only, like the rest of
 * /auth/comprador: the staff guard does not apply, the buyer token is checked here, and a buyer
 * only ever reaches their own list.
 */
@Controller('auth/comprador/favoritos')
export class FavoritesController {
  constructor(
    private readonly buyers: CompradorService,
    private readonly favorites: FavoritesService,
  ) {}

  private async buyerId(authorization?: string) {
    return (await this.buyers.fromSession(bearer(authorization))).id;
  }

  @Public()
  @Get()
  async list(@Headers('authorization') authorization?: string) {
    return { favoritos: await this.favorites.list(await this.buyerId(authorization)) };
  }

  @Public()
  @Get('ids')
  async ids(@Headers('authorization') authorization?: string) {
    return { ids: await this.favorites.ids(await this.buyerId(authorization)) };
  }

  @Public()
  @Put(':productoId')
  async add(
    @Param('productoId', new ParseUUIDPipe()) productoId: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.favorites.add(await this.buyerId(authorization), productoId);
  }

  @Public()
  @Delete(':productoId')
  async remove(
    @Param('productoId', new ParseUUIDPipe()) productoId: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.favorites.remove(await this.buyerId(authorization), productoId);
  }
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Falla rápido en el arranque si falta la config, en vez de emitir
      // tokens firmados con un secreto vacío/adivinable.
      throw new Error('JWT_SECRET no está configurado (ver apps/api/.env)');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // El retorno de validate() es lo que Nest inyecta como request.user.
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return {
      id: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      empresaId: payload.empresaId,
      permisos: payload.permisos,
    };
  }
}

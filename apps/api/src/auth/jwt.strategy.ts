import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Fail fast at startup if the config is missing, instead of issuing
      // tokens signed with an empty/guessable secret.
      throw new Error('JWT_SECRET no está configurado (ver apps/api/.env)');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // The return value of validate() is what Nest injects as request.user.
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return {
      id: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      empresaId: payload.empresaId,
      permisos: payload.permisos,
      rol: payload.rol,
      estadoLegajo: payload.estadoLegajo,
      type: payload.type ?? 'usuario', // tokens anteriores a RF-17 no tienen `type`
      esMayorista: payload.esMayorista,
    };
  }
}

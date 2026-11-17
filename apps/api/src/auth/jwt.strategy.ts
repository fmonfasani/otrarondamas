import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from './auth.types';
import { MfaPolicyService } from './mfa/mfa-policy.service';

/** Message the web reads to send the person back to sign in with the second factor. */
export const MFA_REQUIRED_MESSAGE = 'MFA_REQUIRED';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly mfaPolicy: MfaPolicyService) {
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
    // OR-B4-044: a staff session that did not pass the second factor is refused when the
    // account needs one (Owner, Admin, Wapsell administrator, or MFA turned on), whatever
    // path issued it (password, invitation, business switch, Google, an older token).
    const type = payload.type ?? 'usuario';
    if (type === 'usuario' && !payload.mfa && (await this.mfaPolicy.requiresMfa(payload.sub))) {
      throw new UnauthorizedException(MFA_REQUIRED_MESSAGE);
    }
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
      mfa: payload.mfa === true,
    };
  }
}

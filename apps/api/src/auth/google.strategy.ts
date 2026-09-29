import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GooglePerfil {
  googleId: string;
  email: string;
  nombre: string;
  fotoUrl: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL = process.env.GOOGLE_CALLBACK_URL;
    if (!clientID || !clientSecret || !callbackURL) {
      // Mismo criterio que JwtStrategy: falla en el arranque, no en el
      // primer request, si falta config de producción.
      throw new Error(
        'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL no configurados (ver apps/api/.env)',
      );
    }

    const options: StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL,
      scope: ['profile', 'email'],
    };
    super(options);
  }

  // Passport llama a esto después de que Google redirige de vuelta con el
  // código de autorización ya canjeado. `profile` es lo que Google entrega
  // del perfil básico OAuth (id, displayName, emails[], photos[]) — no hay
  // teléfono, dirección ni fecha de nacimiento en este scope, Google no los
  // expone vía OAuth estándar sin scopes adicionales sujetos a verificación
  // manual de la app por parte de Google.
  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('La cuenta de Google no tiene un email asociado'), false);
      return;
    }

    const perfil: GooglePerfil = {
      googleId: profile.id,
      email,
      nombre: profile.displayName || email,
      fotoUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, perfil);
  }
}

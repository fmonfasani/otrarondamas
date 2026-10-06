import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GoogleProfile {
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
      // Same criterion as JwtStrategy: fails at startup, not on the first
      // request, if production config is missing.
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

  // Passport calls this after Google redirects back with the authorization
  // code already exchanged. `profile` is what Google hands over from the
  // basic OAuth profile (id, displayName, emails[], photos[]) — there is no
  // phone, address or date of birth in this scope; Google does not expose
  // them through standard OAuth without additional scopes subject to manual
  // verification of the app by Google.
  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('La cuenta de Google no tiene un email asociado'), false);
      return;
    }

    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      nombre: profile.displayName || email,
      fotoUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, googleProfile);
  }
}

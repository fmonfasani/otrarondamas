import type { Profile } from 'passport-google-oauth20';
import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy verified email', () => {
  const env = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost/auth/google/callback';
  });

  afterEach(() => {
    if (env.clientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = env.clientId;
    if (env.clientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = env.clientSecret;
    if (env.callbackUrl === undefined) delete process.env.GOOGLE_CALLBACK_URL;
    else process.env.GOOGLE_CALLBACK_URL = env.callbackUrl;
  });

  function makeProfile(emailVerified: boolean): Profile {
    return {
      id: 'google-user-1',
      displayName: 'Federico',
      emails: [{ value: 'federico@example.com' }],
      photos: [],
      _json: { email_verified: emailVerified },
    } as unknown as Profile;
  }

  it('rejects a profile when Google has not verified the email', () => {
    const strategy = new GoogleStrategy();
    const done = jest.fn() as unknown as Parameters<GoogleStrategy['validate']>[3];

    strategy.validate('access-token', 'refresh-token', makeProfile(false), done);

    expect(done).toHaveBeenCalledWith(expect.any(Error), false);
  });

  it('passes a provider-verified email into the Google profile', () => {
    const strategy = new GoogleStrategy();
    const done = jest.fn() as unknown as Parameters<GoogleStrategy['validate']>[3];

    strategy.validate('access-token', 'refresh-token', makeProfile(true), done);

    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        googleId: 'google-user-1',
        email: 'federico@example.com',
        emailVerified: true,
      }),
    );
  });
});

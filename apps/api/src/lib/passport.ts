import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import { env, googleCallbackUrl } from '../config/env.js';
import type { GoogleProfileInput } from '../services/auth.service.js';

let configured = false;

export function mapGoogleProfile(profile: Profile): GoogleProfileInput {
  const emailEntry = profile.emails?.find((entry) => entry.value);
  return {
    googleId: profile.id,
    email: emailEntry?.value ?? '',
    displayName: profile.displayName || null,
    emailVerified: emailEntry?.verified !== false,
  };
}

export function configurePassport(): void {
  if (configured) {
    return;
  }
  configured = true;

  if (!env.GOOGLE_OAUTH_ENABLED) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
        callbackURL: googleCallbackUrl,
      },
      (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
      ) => {
        done(null, mapGoogleProfile(profile));
      },
    ),
  );
}

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { normalizeEmail } from './http.js';
import { createUserWithOrg } from './users.js';

export const googleEnabled = Boolean(
  config.google.clientId && config.google.clientSecret,
);

async function findOrCreateGoogleUser(
  googleId: string,
  email: string,
  name: string,
) {
  const byGoogleId = await prisma.user.findUnique({ where: { googleId } });
  if (byGoogleId) return byGoogleId;

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId },
    });
  }

  return createUserWithOrg({ email, name, googleId });
}

if (googleEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = normalizeEmail(profile._json.email);
          if (!email || !profile._json.email_verified) return done(null, false);

          const user = await findOrCreateGoogleUser(
            profile.id,
            email,
            profile.displayName || email,
          );
          done(null, { id: user.id });
        } catch (error) {
          done(error as Error);
        }
      },
    ),
  );
}

export { passport };

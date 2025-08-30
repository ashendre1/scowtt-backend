import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../prisma/client.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID!,
  clientSecret: GOOGLE_CLIENT_SECRET!,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await prisma.user.findUnique({
      where: { googleId: profile.id }
    });

    if (user) {
      user = await prisma.user.update({
        where: { googleId: profile.id },
        data: {
          profilePhoto: profile.photos?.[0]?.value || null,
        }
      });
      return done(null, user);
    }

    user = await prisma.user.create({
      data: {
        googleId: profile.id,
        username: profile.displayName || null,
        email: profile.emails?.[0]?.value || null,
        profilePhoto: profile.photos?.[0]?.value || null,
        password: null 
      }
    });

    return done(null, user);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error as Error, undefined);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    console.error('Deserialize user error:', error);
    done(error as Error, undefined);
  }
});

export default passport;
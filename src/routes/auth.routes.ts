import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import {
  googleCallback,
  login,
  logout,
  logoutAll,
  refresh,
  signup,
} from '../controllers/auth.controller.js';
import { googleEnabled, passport } from '../lib/passport.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

function requireGoogle(_req: Request, res: Response, next: NextFunction) {
  if (!googleEnabled)
    return res.redirect(`${config.clientUrl}/login?error=google_disabled`);
  next();
}

authRouter.post('/signup', signup);
authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.post('/logout-all', requireAuth, logoutAll);

authRouter.get(
  '/google',
  requireGoogle,
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
);
authRouter.get(
  '/google/callback',
  requireGoogle,
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.clientUrl}/login?error=google`,
  }),
  googleCallback,
);

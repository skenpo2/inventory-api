import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config.js';
import { me } from './controllers/auth.controller.js';
import { HttpError } from './lib/http.js';
import { requireAuth } from './middleware/auth.js';
import { Prisma } from './prisma.js';
import { authRouter } from './routes/auth.routes.js';
import { invitesRouter } from './routes/invites.routes.js';
import { orgsRouter } from './routes/orgs.routes.js';

export const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.get('/api/me', requireAuth, me);
app.use('/api/orgs', orgsRouter);
app.use('/api/invites', invitesRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

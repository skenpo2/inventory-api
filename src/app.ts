import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Prisma } from './prisma.js';
import { HttpError } from './lib/http.js';
import { productsRouter } from './routes/products.routes.js';
import { authRouter } from './routes/auth.routes.js';
import cors from 'cors';

export const app = express();

app.use(express.json());
app.use(cors());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/products', productsRouter);

// Turns our own errors and common Prisma errors into clean JSON responses.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'That value must be unique', target: err.meta?.target });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { HttpError } from './http.js';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REUSE_GRACE_MS = 10_000;

const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

export function signAccessToken(userId: number) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, {
    expiresIn: config.accessTokenTtl as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
  return Number(payload.sub);
}

const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export async function issueRefreshToken(res: Response, userId: number) {
  const token = randomBytes(32).toString('base64url');

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions,
    maxAge: REFRESH_TTL_MS,
  });
}

export async function rotateRefreshToken(req: Request, res: Response) {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) throw new HttpError(401, 'Not signed in');

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash(token) },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw new HttpError(401, 'Session expired');
  }

  if (stored.revokedAt) {
    // Two tabs can refresh with the same cookie at once, so only treat a
    // rotated token as stolen once the grace window has passed.
    const age = Date.now() - stored.revokedAt.getTime();
    if (age > REUSE_GRACE_MS) {
      await revokeAllRefreshTokens(stored.userId);
      throw new HttpError(401, 'Session revoked');
    }
  } else {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
  }

  await issueRefreshToken(res, stored.userId);
  return stored.userId;
}

export async function revokeRefreshToken(req: Request, res: Response) {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { tokenHash: hash(token) } });
  }
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
}

export function revokeAllRefreshTokens(userId: number) {
  return prisma.refreshToken.deleteMany({ where: { userId } });
}

import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { HttpError, normalizeEmail } from '../lib/http.js';
import {
  issueRefreshToken,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../lib/tokens.js';
import { createUserWithOrg, toPublicUser } from '../lib/users.js';
import { prisma } from '../prisma.js';
import type { User } from '../prisma.js';

function sendAccessToken(res: Response, user: User) {
  res.json({ accessToken: signAccessToken(user.id), user: toPublicUser(user) });
}

export async function signup(req: Request, res: Response) {
  const email = normalizeEmail(req.body?.email);
  const name = String(req.body?.name ?? '').trim();
  const password = String(req.body?.password ?? '');
  const orgName = String(req.body?.orgName ?? '').trim();

  if (!email || !name) throw new HttpError(400, 'name and email are required');
  if (password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters');
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, 'That email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUserWithOrg({ email, name, passwordHash, orgName });

  await issueRefreshToken(res, user.id);
  res.status(201);
  sendAccessToken(res, user);
}

export async function login(req: Request, res: Response) {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? '');

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user?.passwordHash
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!user || !valid) throw new HttpError(401, 'Invalid email or password');

  await issueRefreshToken(res, user.id);
  sendAccessToken(res, user);
}

export async function refresh(req: Request, res: Response) {
  const userId = await rotateRefreshToken(req, res);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  sendAccessToken(res, user);
}

export async function logout(req: Request, res: Response) {
  await revokeRefreshToken(req, res);
  res.status(204).send();
}

export async function logoutAll(req: Request, res: Response) {
  await revokeAllRefreshTokens(req.userId);
  await revokeRefreshToken(req, res);
  res.status(204).send();
}

export async function googleCallback(req: Request, res: Response) {
  await issueRefreshToken(res, req.user!.id);
  res.redirect(`${config.clientUrl}/dashboard`);
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.userId },
    include: {
      memberships: { include: { org: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  res.json({
    user: toPublicUser(user),
    memberships: user.memberships.map(({ role, org }) => ({
      role,
      org: { id: org.id, name: org.name },
    })),
  });
}

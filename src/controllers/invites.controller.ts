import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { HttpError, normalizeEmail } from '../lib/http.js';
import { roleRank } from '../middleware/auth.js';
import { prisma, Role } from '../prisma.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const pending = () => ({ acceptedAt: null, expiresAt: { gt: new Date() } });

async function findPendingInvite(token: unknown) {
  const invite = await prisma.invite.findFirst({
    where: { token: String(token), ...pending() },
    include: { org: true },
  });
  if (!invite) throw new HttpError(404, 'Invite not found or expired');
  return invite;
}

export async function listInvites(req: Request, res: Response) {
  const invites = await prisma.invite.findMany({
    where: { orgId: req.membership.orgId, ...pending() },
    orderBy: { createdAt: 'desc' },
  });
  res.json(invites);
}

export async function createInvite(req: Request, res: Response) {
  const orgId = req.membership.orgId;
  const email = normalizeEmail(req.body?.email);
  const role = req.body?.role ?? Role.MEMBER;

  if (!email) throw new HttpError(400, 'email is required');
  if (!Object.values(Role).includes(role))
    throw new HttpError(400, 'Unknown role');
  if (roleRank[role as Role] >= roleRank[req.membership.role]) {
    throw new HttpError(403, `You cannot invite someone as ${role}`);
  }

  const existing = await prisma.membership.findFirst({
    where: { orgId, user: { email } },
  });
  if (existing) throw new HttpError(409, `${email} is already a member`);

  const invite = await prisma.invite.create({
    data: {
      orgId,
      email,
      role,
      token: randomBytes(24).toString('base64url'),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  res.status(201).json(invite);
}

export async function getInvite(req: Request, res: Response) {
  const invite = await findPendingInvite(req.params.token);
  res.json({
    email: invite.email,
    role: invite.role,
    org: { name: invite.org.name },
  });
}

export async function acceptInvite(req: Request, res: Response) {
  const invite = await findPendingInvite(req.params.token);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.userId },
  });

  if (user.email !== invite.email) {
    throw new HttpError(403, `This invite was sent to ${invite.email}`);
  }

  await prisma.$transaction([
    prisma.membership.create({
      data: { userId: user.id, orgId: invite.orgId, role: invite.role },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  res.json({ orgId: invite.orgId });
}

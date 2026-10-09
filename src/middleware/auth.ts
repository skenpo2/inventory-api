import type { NextFunction, Request, Response } from 'express';
import { HttpError, parseId } from '../lib/http.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { prisma, Role } from '../prisma.js';

export const roleRank: Record<Role, number> = {
  [Role.MEMBER]: 1,
  [Role.ADMIN]: 2,
  [Role.OWNER]: 3,
};

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Missing access token');

  try {
    req.userId = verifyAccessToken(token);
  } catch {
    throw new HttpError(401, 'Invalid or expired access token');
  }
  next();
}

export function requireRole(minRole: Role) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const orgId = parseId(req.params.orgId);

    const membership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId: req.userId, orgId } },
    });

    if (!membership) throw new HttpError(404, 'Organization not found');
    if (roleRank[membership.role] < roleRank[minRole]) {
      throw new HttpError(403, `Requires ${minRole} role`);
    }

    req.membership = membership;
    next();
  };
}

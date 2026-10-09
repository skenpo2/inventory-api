import type { Request, Response } from 'express';
import { HttpError, parseId } from '../lib/http.js';
import { prisma, Role } from '../prisma.js';

async function findEditableMember(req: Request) {
  const userId = parseId(req.params.userId);
  const where = { userId_orgId: { userId, orgId: req.membership.orgId } };

  const member = await prisma.membership.findUnique({ where });
  if (!member) throw new HttpError(404, 'Member not found');
  if (member.role === Role.OWNER) {
    throw new HttpError(403, 'The owner cannot be changed or removed');
  }
  return where;
}

export async function listMembers(req: Request, res: Response) {
  const memberships = await prisma.membership.findMany({
    where: { orgId: req.membership.orgId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json(memberships.map(({ user, role }) => ({ ...user, role })));
}

export async function updateMemberRole(req: Request, res: Response) {
  const role = req.body?.role;
  if (role !== Role.ADMIN && role !== Role.MEMBER) {
    throw new HttpError(400, 'role must be ADMIN or MEMBER');
  }

  const where = await findEditableMember(req);
  const membership = await prisma.membership.update({ where, data: { role } });
  res.json(membership);
}

export async function removeMember(req: Request, res: Response) {
  const where = await findEditableMember(req);
  await prisma.membership.delete({ where });
  res.status(204).send();
}

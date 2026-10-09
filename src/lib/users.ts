import { prisma, Role } from '../prisma.js';
import type { User } from '../prisma.js';

export const toPublicUser = ({ id, email, name }: User) => ({
  id,
  email,
  name,
});

interface NewUser {
  email: string;
  name: string;
  passwordHash?: string;
  googleId?: string;
  orgName?: string;
}

export function createUserWithOrg({ orgName, ...data }: NewUser) {
  return prisma.user.create({
    data: {
      ...data,
      memberships: {
        create: {
          role: Role.OWNER,
          org: { create: { name: orgName || `${data.name}'s workspace` } },
        },
      },
    },
  });
}

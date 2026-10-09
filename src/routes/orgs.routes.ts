import { Router } from 'express';
import {
  listMembers,
  removeMember,
  updateMemberRole,
} from '../controllers/members.controller.js';
import {
  createInvite,
  listInvites,
} from '../controllers/invites.controller.js';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '../controllers/products.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Role } from '../prisma.js';

export const orgsRouter = Router();

orgsRouter.use(requireAuth);

orgsRouter.get('/:orgId/products', requireRole(Role.MEMBER), listProducts);
orgsRouter.post('/:orgId/products', requireRole(Role.ADMIN), createProduct);
orgsRouter.patch(
  '/:orgId/products/:id',
  requireRole(Role.ADMIN),
  updateProduct,
);
orgsRouter.delete(
  '/:orgId/products/:id',
  requireRole(Role.ADMIN),
  deleteProduct,
);

orgsRouter.get('/:orgId/members', requireRole(Role.MEMBER), listMembers);
orgsRouter.patch(
  '/:orgId/members/:userId',
  requireRole(Role.OWNER),
  updateMemberRole,
);
orgsRouter.delete(
  '/:orgId/members/:userId',
  requireRole(Role.OWNER),
  removeMember,
);

orgsRouter.get('/:orgId/invites', requireRole(Role.ADMIN), listInvites);
orgsRouter.post('/:orgId/invites', requireRole(Role.ADMIN), createInvite);

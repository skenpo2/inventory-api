import { Router } from 'express';
import { acceptInvite, getInvite } from '../controllers/invites.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const invitesRouter = Router();

invitesRouter.get('/:token', getInvite);
invitesRouter.post('/:token/accept', requireAuth, acceptInvite);

import type { Request, Response } from 'express';
import { HttpError } from '../lib/http.js';

// The single demo account. A real app would look the user up and compare a
// password hash; this stays hard-coded so the lesson is about routing.
const DEMO_ACCOUNT = {
  email: 'root@admin.com',
  password: 'rootpass',
};

// POST /auth/login
export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (email !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) {
    throw new HttpError(401, 'Yo! we are just doing demo');
  }

  res.json({
    token: 'demo-token',
    user: { email: DEMO_ACCOUNT.email },
  });
}

import type { Membership } from '../../generated/prisma/client.js';

declare global {
  namespace Express {
    interface User {
      id: number;
    }

    interface Request {
      userId: number;
      membership: Membership;
    }
  }
}

export {};

import type { Role } from '@engineering-lab/shared';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        role: Role;
      };
    }
  }
}

export {};

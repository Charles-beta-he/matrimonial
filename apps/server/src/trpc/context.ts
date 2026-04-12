import type { PrismaClient } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../lib/prisma';
import { AuthService } from '../modules/auth/auth.service';

export type Context = {
  prisma: PrismaClient;
  user: { id: string; role: 'USER' | 'ADMIN' } | null;
  req: Request;
};

export async function createContext({ req }: { req: Request }): Promise<Context> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  let user: Context['user'] = null;

  if (token) {
    const payload = await AuthService.verifyToken(token);
    if (payload) {
      user = { id: payload.sub, role: payload.role ?? 'USER' };
    }
  }

  return { prisma, user, req };
}

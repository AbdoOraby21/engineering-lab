import { PrismaClient } from '@prisma/client';
import { isDevelopment } from '../config/env.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? ['warn', 'error'] : ['error'],
  });

if (isDevelopment) {
  globalForPrisma.prisma = prisma;
}

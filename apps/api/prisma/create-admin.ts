// Creates (or promotes) a single admin user without seeding demo data.
// Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long-password' [ADMIN_NAME=Name] pnpm create-admin
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Admin';
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  if (password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');

  const passwordHash = await bcrypt.hash(password, rounds);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: 'ADMIN', emailVerified: true, isActive: true },
    create: { name, email, passwordHash, role: 'ADMIN', emailVerified: true, isActive: true, locale: 'ar' },
  });
  console.log(`Admin ready: ${admin.email} (${admin.id})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import type { UpdateProfileInput } from '@engineering-lab/shared';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/errors.js';
import { toAuthUser } from '../utils/serialize.js';

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw AppError.unauthorized();
  }
  if (!user.isActive) {
    throw AppError.forbidden('This account has been disabled');
  }
  return toAuthUser(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw AppError.unauthorized();
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.phone === undefined ? {} : { phone: input.phone }),
      ...(input.locale === undefined ? {} : { locale: input.locale }),
    },
  });

  return toAuthUser(updated);
}

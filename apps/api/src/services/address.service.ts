import type { AddressInput, AddressUpdateInput } from '@engineering-lab/shared';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { toAddressDto } from '../utils/serialize.js';

const addressOrder = [{ isDefault: 'desc' as const }, { createdAt: 'desc' as const }];

export async function listAddresses(userId: string) {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: addressOrder,
  });
  return addresses.map(toAddressDto);
}

export async function createAddress(userId: string, input: AddressInput) {
  const address = await prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    const makeDefault = input.isDefault || count === 0;

    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId,
        label: input.label,
        governorate: input.governorate,
        city: input.city,
        street: input.street,
        building: input.building,
        notes: input.notes,
        isDefault: makeDefault,
      },
    });
  });

  return toAddressDto(address);
}

export async function updateAddress(userId: string, addressId: string, input: AddressUpdateInput) {
  const existing = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!existing) {
    throw AppError.notFound('Address not found', ErrorCodes.ADDRESS_NOT_FOUND);
  }

  const address = await prisma.$transaction(async (tx) => {
    if (input.isDefault === true) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id: addressId },
      data: {
        ...(input.label === undefined ? {} : { label: input.label }),
        ...(input.governorate === undefined ? {} : { governorate: input.governorate }),
        ...(input.city === undefined ? {} : { city: input.city }),
        ...(input.street === undefined ? {} : { street: input.street }),
        ...(input.building === undefined ? {} : { building: input.building }),
        ...(input.notes === undefined ? {} : { notes: input.notes }),
        ...(input.isDefault === undefined ? {} : { isDefault: input.isDefault }),
      },
    });
  });

  return toAddressDto(address);
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const existing = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!existing) {
    throw AppError.notFound('Address not found', ErrorCodes.ADDRESS_NOT_FOUND);
  }

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });

    if (existing.isDefault) {
      const nextAddress = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      if (nextAddress) {
        await tx.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }
  });
}

export async function setDefaultAddress(userId: string, addressId: string) {
  const existing = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!existing) {
    throw AppError.notFound('Address not found', ErrorCodes.ADDRESS_NOT_FOUND);
  }

  const address = await prisma.$transaction(async (tx) => {
    await tx.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    return tx.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  });

  return toAddressDto(address);
}

import type { Address, User } from '@prisma/client';
import type { AddressDto, AuthUser, Locale } from '@engineering-lab/shared';

function normalizeLocale(locale: string): Locale {
  return locale === 'en' ? 'en' : 'ar';
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    locale: normalizeLocale(user.locale),
    createdAt: user.createdAt.toISOString(),
  };
}

export function toAddressDto(address: Address): AddressDto {
  return {
    id: address.id,
    label: address.label,
    governorate: address.governorate,
    city: address.city,
    street: address.street,
    building: address.building,
    notes: address.notes,
    isDefault: address.isDefault,
    createdAt: address.createdAt.toISOString(),
    updatedAt: address.updatedAt.toISOString(),
  };
}

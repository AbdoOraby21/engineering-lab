import type {
  AddressDto,
  AddressInput,
  AddressUpdateInput,
  AuthResponse,
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '@engineering-lab/shared';
import { api } from './api';

interface Data<T> {
  data: T;
}

export async function loginRequest(input: LoginInput): Promise<AuthResponse> {
  const response = await api.post<Data<AuthResponse>>('/auth/login', input);
  return response.data.data;
}

export interface LoginProviders {
  google: boolean;
}

export async function fetchProvidersRequest(): Promise<LoginProviders> {
  const response = await api.get<Data<LoginProviders>>('/auth/providers');
  return response.data.data;
}

export function googleLoginUrl(locale: string, redirect?: string | null): string {
  const base = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');
  const params = new URLSearchParams({ locale: locale === 'en' ? 'en' : 'ar' });
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    params.set('redirect', redirect);
  }
  return `${base}/auth/google?${params.toString()}`;
}

export async function registerRequest(input: RegisterInput): Promise<AuthResponse> {
  const response = await api.post<Data<AuthResponse>>('/auth/register', input);
  return response.data.data;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await api.get<Data<{ user: AuthUser }>>('/auth/me');
  return response.data.data.user;
}

export async function updateProfileRequest(input: UpdateProfileInput): Promise<AuthUser> {
  const response = await api.patch<Data<{ user: AuthUser }>>('/users/me', input);
  return response.data.data.user;
}

export async function changePasswordRequest(input: ChangePasswordInput): Promise<AuthResponse> {
  const response = await api.post<Data<AuthResponse>>('/users/me/change-password', input);
  return response.data.data;
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPasswordRequest(input: ResetPasswordInput): Promise<void> {
  await api.post('/auth/reset-password', input);
}

export async function verifyEmailRequest(token: string): Promise<AuthUser> {
  const response = await api.post<Data<{ success: boolean; user: AuthUser }>>('/auth/verify-email', {
    token,
  });
  return response.data.data.user;
}

export async function resendVerificationRequest(): Promise<void> {
  await api.post('/auth/resend-verification');
}

export async function listAddressesRequest(): Promise<AddressDto[]> {
  const response = await api.get<Data<{ addresses: AddressDto[] }>>('/users/me/addresses');
  return response.data.data.addresses;
}

export async function createAddressRequest(input: AddressInput): Promise<AddressDto> {
  const response = await api.post<Data<{ address: AddressDto }>>('/users/me/addresses', input);
  return response.data.data.address;
}

export async function updateAddressRequest(
  id: string,
  input: AddressUpdateInput,
): Promise<AddressDto> {
  const response = await api.patch<Data<{ address: AddressDto }>>(
    `/users/me/addresses/${id}`,
    input,
  );
  return response.data.data.address;
}

export async function deleteAddressRequest(id: string): Promise<void> {
  await api.delete(`/users/me/addresses/${id}`);
}

export async function setDefaultAddressRequest(id: string): Promise<AddressDto> {
  const response = await api.post<Data<{ address: AddressDto }>>(
    `/users/me/addresses/${id}/default`,
  );
  return response.data.data.address;
}

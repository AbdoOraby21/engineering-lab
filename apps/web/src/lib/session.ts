import { refreshAccessToken } from './api';
import { useAuthStore } from '../stores/auth.store';

let bootPromise: Promise<void> | null = null;

export function ensureSession(): Promise<void> {
  if (!bootPromise) {
    bootPromise = refreshAccessToken().then((token) => {
      if (!token) {
        useAuthStore.getState().setStatus('guest');
      }
    });
  }
  return bootPromise;
}

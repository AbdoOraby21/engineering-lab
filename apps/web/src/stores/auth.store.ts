import { create } from 'zustand';
import type { AuthResponse, AuthUser } from '@engineering-lab/shared';

export type AuthStatus = 'loading' | 'authenticated' | 'guest';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  setSession: (session: AuthResponse) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: 'loading',
  setSession: (session) =>
    set({ user: session.user, accessToken: session.accessToken, status: 'authenticated' }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
  clear: () => set({ user: null, accessToken: null, status: 'guest' }),
}));

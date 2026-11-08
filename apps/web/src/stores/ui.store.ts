import { create } from 'zustand';

export type Theme = 'dark' | 'light';
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface UiState {
  theme: Theme;
  mobileMenuOpen: boolean;
  toasts: Toast[];
  loginPromptOpen: boolean;
  loginRedirect: string | null;
  toggleTheme: () => void;
  setMobileMenu: (open: boolean) => void;
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  setLoginPrompt: (open: boolean, redirect?: string | null) => void;
}

function readTheme(): Theme {
  try {
    return localStorage.getItem('el_theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem('el_theme', theme);
  } catch {
    return;
  }
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readTheme(),
  mobileMenuOpen: false,
  toasts: [],
  loginPromptOpen: false,
  loginRedirect: null,
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
  setMobileMenu: (open) => set({ mobileMenuOpen: open }),
  addToast: (message, type = 'success') => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    set({ toasts: [...get().toasts, { id, message, type }] });
    window.setTimeout(() => {
      set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
    }, 4500);
  },
  removeToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
  setLoginPrompt: (open, redirect = null) =>
    set({ loginPromptOpen: open, loginRedirect: open ? redirect : null }),
}));

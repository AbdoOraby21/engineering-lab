import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchProvidersRequest, googleLoginUrl } from '../../lib/authApi';

interface GoogleButtonProps {
  locale: string;
  redirect?: string | null;
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44c-.29 1.44-1.14 2.67-2.4 3.5v2.92h3.88c2.27-2.09 3.57-5.18 3.57-8.66z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-2.92c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.27v3.01C3.24 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.37c-.24-.72-.37-1.49-.37-2.29s.13-1.57.37-2.29V6.78H1.27C.46 8.39 0 10.14 0 12s.46 3.61 1.27 5.22l4.02-2.85z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.31 0 3.24 2.7 1.27 6.78l4.02 2.85c.94-2.84 3.59-4.88 6.71-4.88z"
      />
    </svg>
  );
}

export default function GoogleButton({ locale, redirect }: GoogleButtonProps) {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['auth-providers'],
    queryFn: fetchProvidersRequest,
    staleTime: 60_000,
    retry: false,
  });

  if (!data?.google) {
    return null;
  }

  return (
    <a href={googleLoginUrl(locale, redirect)} className="btn-secondary flex w-full items-center justify-center gap-2 py-3">
      <GoogleIcon />
      {t('auth.continueWithGoogle')}
    </a>
  );
}

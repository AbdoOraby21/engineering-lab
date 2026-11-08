import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';

export default function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="icon-btn"
      aria-label={`${t('common.theme')}: ${theme === 'dark' ? t('common.dark') : t('common.light')}`}
      title={theme === 'dark' ? t('common.light') : t('common.dark')}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

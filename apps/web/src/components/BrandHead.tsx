import { useEffect } from 'react';
import { useSiteSettings } from '../hooks/useSiteSettings';

/**
 * Applies the admin-configured favicon override (settings.faviconUrl) to the
 * static favicon links in index.html. When no override is set, the generated
 * brand favicon set is left untouched.
 */
export default function BrandHead() {
  const settingsQuery = useSiteSettings();
  const override = settingsQuery.data?.faviconUrl?.trim();

  useEffect(() => {
    if (!override) {
      return;
    }
    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]'),
    );
    const originals = links.map((link) => link.getAttribute('href'));
    for (const link of links) {
      link.setAttribute('href', override);
    }
    return () => {
      links.forEach((link, index) => {
        const original = originals[index];
        if (original) {
          link.setAttribute('href', original);
        }
      });
    };
  }, [override]);

  return null;
}

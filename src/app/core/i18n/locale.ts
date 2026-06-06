/** Supported content languages. German is the default (Austria-first). */
export type Locale = 'de' | 'en';

export const LOCALES: readonly Locale[] = ['de', 'en'];
export const DEFAULT_LOCALE: Locale = 'de';

/** Home path for a locale: de → '/', en → '/en'. */
export function homePath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}`;
}

/** `<html lang>` value per locale. */
export const HTML_LANG: Record<Locale, string> = { de: 'de-AT', en: 'en' };

/** Open Graph locale per content language. */
export const OG_LOCALE: Record<Locale, string> = { de: 'de_AT', en: 'en_US' };

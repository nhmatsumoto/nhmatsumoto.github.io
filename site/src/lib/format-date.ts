import type { Locale } from "./i18n/dictionary";

const INTL_LOCALE: Record<Locale, string> = {
  "pt-BR": "pt-BR",
  en: "en-US",
  ja: "ja-JP",
};

export function formatDateLong(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "long" }).format(
    new Date(iso),
  );
}

export function formatDateShort(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

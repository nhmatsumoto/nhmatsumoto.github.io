import { createContextId, type Signal } from "@builder.io/qwik";
import type { Locale } from "./dictionary";

export const LocaleContext = createContextId<Signal<Locale>>(
  "site-locale-context",
);

export const LOCALE_STORAGE_KEY = "site-locale";

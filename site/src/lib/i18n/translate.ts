import { dictionary, LOCALE_INDEX, type Locale } from "./dictionary";

export function translate(key: string, locale: Locale): string {
  const entry = dictionary[key];
  if (!entry) return key;
  return entry[LOCALE_INDEX[locale]];
}

// Deliberately not a `useTranslate()` custom hook returning a closure: in
// this Qwik version, a custom hook whose return value is a plain (non-QRL)
// function breaks SSG serialization in any component that also defines a
// `$()` QRL (event handler, task, ...) — the optimizer's capture analysis
// mis-serializes the closure and throws QError_verifySerializable. Call
// useContext(LocaleContext) + this function directly in each component instead:
//
//   const localeSignal = useContext(LocaleContext);
//   const t = (key: string) => translate(key, localeSignal.value);

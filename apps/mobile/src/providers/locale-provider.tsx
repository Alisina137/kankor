import { getDirection, getMessages, type SupportedLocale } from "@kankor/config";
import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  direction: "rtl" | "ltr";
  text: ReturnType<typeof getMessages>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<SupportedLocale>("fa");

  const value = useMemo(() => ({
    locale,
    setLocale,
    direction: getDirection(locale),
    text: getMessages(locale)
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}

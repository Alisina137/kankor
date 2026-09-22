export type SupportedLocale = "fa" | "ps" | "en";

export const supportedLocales: SupportedLocale[] = ["fa", "ps", "en"];

export const localeMeta: Record<SupportedLocale, { label: string; direction: "rtl" | "ltr" }> = {
  fa: { label: "دری", direction: "rtl" },
  ps: { label: "پښتو", direction: "rtl" },
  en: { label: "English", direction: "ltr" }
};

export const messages = {
  fa: {
    appName: "آمادگی کانکور",
    home: "خانه",
    practice: "تمرین",
    exams: "امتحانات",
    progress: "پیشرفت",
    profile: "پروفایل",
    phaseTitle: "بنیاد برنامه آماده است",
    phaseBody: "ساختار موبایل، راست‌به‌چپ و زبان‌ها برای توسعه مرحله‌های بعدی آماده شده است.",
    comingLater: "این بخش در مرحله مربوطه تکمیل می‌شود.",
    language: "زبان"
  },
  ps: {
    appName: "کانکور چمتووالی",
    home: "کور",
    practice: "تمرین",
    exams: "ازموینې",
    progress: "پرمختګ",
    profile: "پروفایل",
    phaseTitle: "د اپ بنسټ چمتو دی",
    phaseBody: "د موبایل جوړښت، ښي-څخه-چپ لوري او ژبې د راتلونکو پړاوونو لپاره چمتو دي.",
    comingLater: "دا برخه به په خپل اړوند پړاو کې بشپړه شي.",
    language: "ژبه"
  },
  en: {
    appName: "KankorPrep",
    home: "Home",
    practice: "Practice",
    exams: "Exams",
    progress: "Progress",
    profile: "Profile",
    phaseTitle: "App foundation is ready",
    phaseBody: "The mobile shell, direction support, and localization architecture are ready for later phases.",
    comingLater: "This area will be completed in its approved phase.",
    language: "Language"
  }
} as const;

export const theme = {
  colors: {
    background: "#F7F8FA",
    surface: "#FFFFFF",
    text: "#171A1F",
    mutedText: "#667085",
    border: "#E4E7EC",
    primary: "#2457D6",
    primarySoft: "#EAF0FF",
    success: "#14804A",
    warning: "#B54708",
    danger: "#B42318"
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 18, pill: 999 },
  typography: { body: 16, small: 13, title: 26, heading: 20 }
} as const;

export function getDirection(locale: SupportedLocale) {
  return localeMeta[locale].direction;
}

export function getMessages(locale: SupportedLocale) {
  return messages[locale];
}

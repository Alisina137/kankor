export type SupportedLocale = "fa" | "ps" | "en";

export const supportedLocales: SupportedLocale[] = ["fa", "ps", "en"];

export const localeMeta: Record<SupportedLocale, { label: string; direction: "rtl" | "ltr" }> = {
  fa: { label: "دری", direction: "rtl" },
  ps: { label: "پښتو", direction: "rtl" },
  en: { label: "English", direction: "ltr" }
};

const shared = {
  fa: {
    appName: "آمادگی کانکور", home: "خانه", practice: "تمرین", exams: "امتحانات", progress: "پیشرفت", profile: "پروفایل",
    comingLater: "این بخش در مرحله مربوطه تکمیل می‌شود.", language: "زبان",
    welcomeTitle: "برای کانکور با برنامه آماده شوید", welcomeBody: "حساب خود را بسازید، هدف کانکور خود را تعیین کنید و پیشرفت‌تان را در یک جا دنبال کنید.",
    createAccount: "ساخت حساب", signIn: "ورود", email: "ایمیل", password: "رمز عبور", confirmPassword: "تأیید رمز عبور",
    noAccount: "حساب ندارید؟", haveAccount: "قبلاً حساب دارید؟", forgotPassword: "رمز عبور را فراموش کرده‌اید؟",
    continue: "ادامه", back: "بازگشت", targetYear: "سال هدف کانکور", preparationLevel: "سطح آمادگی (اختیاری)",
    starting: "تازه شروع کرده‌ام", somePreparation: "کمی آمادگی دارم", intensive: "آمادگی جدی",
    onboardingTitle: "آمادگی‌تان را تنظیم کنید", onboardingBody: "فقط اطلاعات ضروری را می‌پرسیم تا تجربه شما شخصی شود.",
    homeTitle: "آماده‌اید ادامه دهید", homeBody: "حساب و تنظیمات آمادگی شما فعال است. بخش‌های درسی در مرحله بعد اضافه می‌شوند.",
    targetLabel: "کانکور هدف", account: "حساب", logout: "خروج", deleteAccount: "حذف حساب",
    deleteConfirm: "آیا مطمئن هستید؟ حذف حساب قابل برگشت نیست.", cancel: "لغو", delete: "حذف",
    recoveryTitle: "بازیابی حساب", recoveryBody: "ایمیل حساب خود را وارد کنید تا روند بازیابی آغاز شود.", sendRecovery: "درخواست بازیابی",
    resetTitle: "تنظیم رمز جدید", resetToken: "کُد بازیابی", newPassword: "رمز جدید", resetPassword: "تغییر رمز",
    recoveryAccepted: "اگر این ایمیل ثبت شده باشد، درخواست بازیابی ایجاد شد.", diagnosticLater: "آزمون تشخیصی پس از تکمیل سیستم امتحانات فعال می‌شود.",
    required: "این فیلد ضروری است.", invalidEmail: "ایمیل معتبر وارد کنید.", passwordLength: "رمز عبور باید حداقل ۸ حرف باشد.",
    passwordMismatch: "رمزهای عبور یکسان نیستند.", genericError: "مشکلی رخ داد. دوباره تلاش کنید.", networkError: "اتصال با سرور برقرار نشد.",
    emailExists: "این ایمیل قبلاً ثبت شده است.", invalidCredentials: "ایمیل یا رمز عبور نادرست است."
  },
  ps: {
    appName: "کانکور چمتووالی", home: "کور", practice: "تمرین", exams: "ازموینې", progress: "پرمختګ", profile: "پروفایل",
    comingLater: "دا برخه به په خپل اړوند پړاو کې بشپړه شي.", language: "ژبه",
    welcomeTitle: "کانکور ته په منظم ډول چمتو شئ", welcomeBody: "خپل حساب جوړ کړئ، د کانکور هدف وټاکئ او پرمختګ مو په یوه ځای کې تعقیب کړئ.",
    createAccount: "حساب جوړول", signIn: "ننوتل", email: "برېښنالیک", password: "پټنوم", confirmPassword: "پټنوم تایید",
    noAccount: "حساب نه لرئ؟", haveAccount: "له مخکې حساب لرئ؟", forgotPassword: "پټنوم مو هېر شوی؟",
    continue: "دوام", back: "شاته", targetYear: "د کانکور هدف کال", preparationLevel: "د چمتووالي کچه (اختیاري)",
    starting: "اوس پیل کوم", somePreparation: "یو څه چمتووالی لرم", intensive: "جدي چمتووالی",
    onboardingTitle: "خپل چمتووالی تنظیم کړئ", onboardingBody: "یوازې اړین معلومات اخلو تر څو تجربه مو شخصي شي.",
    homeTitle: "دوام ته چمتو یاست", homeBody: "ستاسو حساب او د چمتووالي تنظیمات فعال دي. درسي برخې به په راتلونکي پړاو کې اضافه شي.",
    targetLabel: "هدف کانکور", account: "حساب", logout: "وتل", deleteAccount: "حساب ړنګول",
    deleteConfirm: "ایا ډاډه یاست؟ د حساب ړنګول بېرته نه راګرځي.", cancel: "لغوه", delete: "ړنګول",
    recoveryTitle: "حساب بېرته ترلاسه کول", recoveryBody: "خپل برېښنالیک ولیکئ تر څو د بېرته ترلاسه کولو بهیر پیل شي.", sendRecovery: "د بېرته ترلاسه کولو غوښتنه",
    resetTitle: "نوی پټنوم وټاکئ", resetToken: "د بېرته ترلاسه کولو کوډ", newPassword: "نوی پټنوم", resetPassword: "پټنوم بدلول",
    recoveryAccepted: "که دا برېښنالیک ثبت وي، د بېرته ترلاسه کولو غوښتنه جوړه شوه.", diagnosticLater: "تشخیصي ازموینه به د ازموینو سیستم له بشپړېدو وروسته فعاله شي.",
    required: "دا برخه اړینه ده.", invalidEmail: "سم برېښنالیک ولیکئ.", passwordLength: "پټنوم باید لږ تر لږه ۸ توري ولري.",
    passwordMismatch: "پټنومونه یو شان نه دي.", genericError: "ستونزه رامنځته شوه. بیا هڅه وکړئ.", networkError: "له سرور سره اړیکه ونه شوه.",
    emailExists: "دا برېښنالیک مخکې ثبت شوی.", invalidCredentials: "برېښنالیک یا پټنوم سم نه دی."
  },
  en: {
    appName: "KankorPrep", home: "Home", practice: "Practice", exams: "Exams", progress: "Progress", profile: "Profile",
    comingLater: "This area will be completed in its approved phase.", language: "Language",
    welcomeTitle: "Prepare for Kankor with a clear plan", welcomeBody: "Create your account, set your Kankor target, and keep your preparation in one place.",
    createAccount: "Create account", signIn: "Sign in", email: "Email", password: "Password", confirmPassword: "Confirm password",
    noAccount: "Don't have an account?", haveAccount: "Already have an account?", forgotPassword: "Forgot password?",
    continue: "Continue", back: "Back", targetYear: "Target Kankor year", preparationLevel: "Preparation level (optional)",
    starting: "Just starting", somePreparation: "Some preparation", intensive: "Intensive preparation",
    onboardingTitle: "Set up your preparation", onboardingBody: "We only ask for what is needed to personalize your starting experience.",
    homeTitle: "You're ready to continue", homeBody: "Your account and preparation preferences are active. Curriculum features arrive in the next approved phase.",
    targetLabel: "Target Kankor", account: "Account", logout: "Log out", deleteAccount: "Delete account",
    deleteConfirm: "Are you sure? Account deletion cannot be undone.", cancel: "Cancel", delete: "Delete",
    recoveryTitle: "Recover your account", recoveryBody: "Enter your account email to begin password recovery.", sendRecovery: "Request recovery",
    resetTitle: "Set a new password", resetToken: "Recovery code", newPassword: "New password", resetPassword: "Reset password",
    recoveryAccepted: "If that email exists, a recovery request has been created.", diagnosticLater: "The diagnostic exam will become available when the exam engine is implemented.",
    required: "This field is required.", invalidEmail: "Enter a valid email.", passwordLength: "Password must be at least 8 characters.",
    passwordMismatch: "Passwords do not match.", genericError: "Something went wrong. Try again.", networkError: "Could not connect to the server.",
    emailExists: "This email is already registered.", invalidCredentials: "Email or password is incorrect."
  }
} as const;

export const messages = shared;

export const theme = {
  colors: {
    background: "#F7F8FA", surface: "#FFFFFF", text: "#171A1F", mutedText: "#667085", border: "#E4E7EC",
    primary: "#2457D6", primarySoft: "#EAF0FF", success: "#14804A", warning: "#B54708", danger: "#B42318"
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 18, pill: 999 },
  typography: { body: 16, small: 13, title: 26, heading: 20 }
} as const;

export function getDirection(locale: SupportedLocale) { return localeMeta[locale].direction; }
export function getMessages(locale: SupportedLocale) { return messages[locale]; }

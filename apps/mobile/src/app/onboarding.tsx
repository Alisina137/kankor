import Ionicons from "@expo/vector-icons/Ionicons";
import { localeMeta, theme, type SupportedLocale } from "@kankor/config";
import { Redirect, router } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppButton } from "../components/app-button";
import { AppText as Text } from "../components/app-text";
import { AuthIllustration } from "../components/auth-illustration";
import { Screen } from "../components/screen";
import { setPendingWelcomeMessage } from "../lib/welcome-message-storage";
import { useAuth } from "../providers/auth-provider";
import { useLocale } from "../providers/locale-provider";

const years = [1405, 1406, 1407, 1408, 1409, 1410];
const levels = ["starting", "some_preparation", "intensive", null] as const;

const levelIcons: Record<string, ComponentProps<typeof Ionicons>["name"]> = {
  starting: "sparkles-outline",
  some_preparation: "book-outline",
  intensive: "flash-outline",
  none: "help-circle-outline"
};

const copy = {
  fa: {
    setup: "تنظیم سریع",
    step: "مرحله",
    of: "از",
    back: "بازگشت",
    next: "ادامه",
    finish: "شروع آمادگی",
    languageTitle: "زبان برنامه را انتخاب کنید",
    languageBody: "زبان دلخواه شما در سراسر برنامه، تمرین‌ها و نتایج استفاده می‌شود.",
    languageHint: "هر زمان می‌توانید زبان را از پروفایل تغییر دهید.",
    targetTitle: "هدف کانکور شما چه سالی است؟",
    targetBody: "سال هدف کمک می‌کند برنامه و پیشرفت شما با زمان باقی‌مانده هماهنگ باشد.",
    targetHint: "سال را انتخاب کنید که قصد دارید در کانکور شرکت کنید.",
    levelTitle: "در حال حاضر چقدر آماده‌اید؟",
    levelBody: "این فقط نقطه شروع شما را مشخص می‌کند و بعداً قابل تغییر است.",
    startingTitle: "تازه شروع کرده‌ام",
    startingBody: "می‌خواهم از پایه و با برنامه پیش بروم.",
    someTitle: "کمی آمادگی دارم",
    someBody: "مطالعه کرده‌ام و می‌خواهم تمرین منظم‌تر داشته باشم.",
    intensiveTitle: "آمادگی جدی",
    intensiveBody: "در حال آمادگی فشرده هستم و تمرین بیشتر می‌خواهم.",
    unsureTitle: "هنوز مطمئن نیستم",
    unsureBody: "فعلاً بدون تعیین سطح ادامه می‌دهم."
  },
  ps: {
    setup: "چټک تنظیم",
    step: "پړاو",
    of: "له",
    back: "شاته",
    next: "دوام",
    finish: "چمتووالی پیل کړئ",
    languageTitle: "د اپ ژبه وټاکئ",
    languageBody: "ستاسو خوښه ژبه به په ټول اپ، تمرینونو او پایلو کې وکارول شي.",
    languageHint: "ژبه وروسته هر وخت له پروفایل څخه بدلولی شئ.",
    targetTitle: "ستاسو د کانکور هدف کال کوم دی؟",
    targetBody: "هدف کال مرسته کوي چې ستاسو پلان او پرمختګ له پاتې وخت سره برابر شي.",
    targetHint: "هغه کال وټاکئ چې کانکور ورکول غواړئ.",
    levelTitle: "اوس څومره چمتو یاست؟",
    levelBody: "دا یوازې ستاسو د پیل نقطه ټاکي او وروسته یې بدلولی شئ.",
    startingTitle: "اوس پیل کوم",
    startingBody: "غواړم له بنسټه او منظم ډول مخکې لاړ شم.",
    someTitle: "یو څه چمتووالی لرم",
    someBody: "مطالعه مې کړې او منظم تمرین ته اړتیا لرم.",
    intensiveTitle: "جدي چمتووالی",
    intensiveBody: "په فشرده ډول چمتووالی نیسم او ډېر تمرین غواړم.",
    unsureTitle: "لا ډاډه نه یم",
    unsureBody: "اوس لپاره پرته له ټاکلې کچې ادامه ورکوم."
  },
  en: {
    setup: "Quick setup",
    step: "Step",
    of: "of",
    back: "Back",
    next: "Continue",
    finish: "Start preparing",
    languageTitle: "Choose your app language",
    languageBody: "Your preferred language will be used across the app, practice, and results.",
    languageHint: "You can change your language later from Profile.",
    targetTitle: "What is your Kankor target year?",
    targetBody: "Your target year helps keep your plan and progress aligned with the time you have left.",
    targetHint: "Choose the year you plan to take the Kankor exam.",
    levelTitle: "How prepared are you right now?",
    levelBody: "This only sets your starting point and can be changed later.",
    startingTitle: "Just starting",
    startingBody: "I want to build from the basics with a clear plan.",
    someTitle: "Some preparation",
    someBody: "I have studied and want more structured practice.",
    intensiveTitle: "Intensive preparation",
    intensiveBody: "I am preparing seriously and want more practice.",
    unsureTitle: "Not sure yet",
    unsureBody: "Continue without choosing a preparation level for now."
  }
} as const;

export default function OnboardingScreen() {
  const { user, loading, completeOnboarding } = useAuth();
  const { locale, setLocale, direction, text } = useLocale();
  const local = copy[locale];

  const [step, setStep] = useState(0);
  const [year, setYear] = useState(user?.targetExamYear ?? 1406);
  const [level, setLevel] = useState<string | null>(user?.preparationLevel ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!loading && !user) return <Redirect href="/(auth)/login" />;
  if (user?.onboardingCompleted && !busy) return <Redirect href="/(tabs)" />;

  const steps = [
    {
      title: local.languageTitle,
      body: local.languageBody,
      variant: "language" as const
    },
    {
      title: local.targetTitle,
      body: local.targetBody,
      variant: "target" as const
    },
    {
      title: local.levelTitle,
      body: local.levelBody,
      variant: "level" as const
    }
  ];

  function next() {
    setError("");
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    void finish();
  }

  async function finish() {
    setBusy(true);
    setError("");
    try {
      await completeOnboarding({
        preferredLanguage: locale,
        targetExamYear: year,
        preparationLevel: level
      });
      await setPendingWelcomeMessage("new");
      router.replace("/(tabs)");
    } catch {
      setError(text.genericError);
    } finally {
      setBusy(false);
    }
  }

  function levelCopy(item: typeof levels[number]) {
    if (item === "starting") return [local.startingTitle, local.startingBody] as const;
    if (item === "some_preparation") return [local.someTitle, local.someBody] as const;
    if (item === "intensive") return [local.intensiveTitle, local.intensiveBody] as const;
    return [local.unsureTitle, local.unsureBody] as const;
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setStep((current) => Math.max(0, current - 1))}
            style={styles.backButton}
          >
            <Ionicons
              name={direction === "rtl" ? "arrow-forward" : "arrow-back"}
              size={20}
              color={theme.colors.text}
            />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            {local.step} {step + 1} {local.of} {steps.length}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / steps.length) * 100}%` as `${number}%` }
          ]}
        />
      </View>

      <AuthIllustration variant={steps[step].variant} compact />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{local.setup}</Text>
        <Text style={styles.title}>{steps[step].title}</Text>
        <Text style={styles.body}>{steps[step].body}</Text>
      </View>

      <View style={styles.card}>
        {step === 0 ? (
          <>
            <View style={styles.languageGrid}>
              {(["fa", "ps", "en"] as SupportedLocale[]).map((item) => {
                const selected = locale === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    onPress={() => setLocale(item)}
                    style={[styles.languageOption, selected && styles.optionActive]}
                  >
                    <View style={[styles.optionIcon, selected && styles.optionIconActive]}>
                      <Ionicons
                        name="language-outline"
                        size={22}
                        color={selected ? theme.colors.primary : theme.colors.mutedText}
                      />
                    </View>
                    <Text style={[styles.optionTitle, selected && styles.optionTitleActive]}>
                      {localeMeta[item].label}
                    </Text>
                    <Ionicons
                      name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={selected ? theme.colors.primary : theme.colors.border}
                    />
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>{local.languageHint}</Text>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <View style={styles.yearGrid}>
              {years.map((item) => {
                const selected = year === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    onPress={() => setYear(item)}
                    style={[styles.yearOption, selected && styles.yearOptionActive]}
                  >
                    <Text style={[styles.yearText, selected && styles.yearTextActive]}>{item}</Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>{local.targetHint}</Text>
          </>
        ) : null}

        {step === 2 ? (
          <View style={styles.levelList}>
            {levels.map((item) => {
              const key = item ?? "none";
              const selected = level === item;
              const [title, body] = levelCopy(item);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => setLevel(item)}
                  style={[styles.levelOption, selected && styles.optionActive]}
                >
                  <View style={[styles.optionIcon, selected && styles.optionIconActive]}>
                    <Ionicons
                      name={levelIcons[key]}
                      size={22}
                      color={selected ? theme.colors.primary : theme.colors.mutedText}
                    />
                  </View>
                  <View style={styles.levelCopy}>
                    <Text style={[styles.optionTitle, selected && styles.optionTitleActive]}>{title}</Text>
                    <Text style={styles.optionBody}>{body}</Text>
                  </View>
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={selected ? theme.colors.primary : theme.colors.border}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton
        label={step === steps.length - 1 ? local.finish : local.next}
        loading={busy}
        onPress={next}
      />

      {step > 0 ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => setStep((current) => Math.max(0, current - 1))}
          style={styles.backTextButton}
        >
          <Text style={styles.backText}>{local.back}</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg
  },
  topRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: theme.colors.surface
  },
  backPlaceholder: {
    width: 42,
    height: 42
  },
  stepBadge: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft
  },
  stepBadgeText: {
    color: theme.colors.primary,
    fontSize: theme.typography.small,
    fontWeight: "800"
  },
  progressTrack: {
    height: 7,
    overflow: "hidden",
    borderRadius: theme.radius.pill,
    backgroundColor: "#E3E9F4"
  },
  progressFill: {
    height: "100%",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary
  },
  heading: {
    gap: theme.spacing.sm
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: theme.typography.small,
    fontWeight: "900"
  },
  title: {
    color: theme.colors.text,
    fontSize: 29,
    lineHeight: 38,
    fontWeight: "900"
  },
  body: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 25
  },
  card: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    shadowColor: "#17233F",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3
  },
  languageGrid: {
    gap: theme.spacing.sm
  },
  languageOption: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background
  },
  optionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft
  },
  optionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: theme.colors.surface
  },
  optionIconActive: {
    backgroundColor: "#FFFFFF"
  },
  optionTitle: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: "800"
  },
  optionTitleActive: {
    color: theme.colors.primary
  },
  optionBody: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    lineHeight: 20
  },
  hint: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    lineHeight: 21
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  yearOption: {
    width: "47%",
    flexGrow: 1,
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background
  },
  yearOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft
  },
  yearText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  yearTextActive: {
    color: theme.colors.primary
  },
  levelList: {
    gap: theme.spacing.sm
  },
  levelOption: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background
  },
  levelCopy: {
    flex: 1,
    gap: 3
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 21
  },
  backTextButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  backText: {
    color: theme.colors.mutedText,
    fontWeight: "800",
    textAlign: "center"
  }
});

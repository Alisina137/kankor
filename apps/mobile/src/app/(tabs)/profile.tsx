import Ionicons from "@expo/vector-icons/Ionicons";
import { localeMeta, theme, type SupportedLocale } from "@kankor/config";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../components/app-button";
import { Screen } from "../../components/screen";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

type SubscriptionState = {
  tier: "free" | "premium";
  subscription: {
    planNameFa: string;
    planNamePs: string;
    planNameEn: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  entitlements: Record<string, unknown>;
};

type SubscriptionComparison = {
  free: Record<string, unknown>;
  premium: Record<string, boolean>;
};

const years = Array.from({ length: 16 }, (_, index) => 1405 + index);
const languages: SupportedLocale[] = ["fa", "ps", "en"];
const levels = [null, "starting", "some_preparation", "intensive"] as const;

const copy = {
  fa: {
    title: "پروفایل",
    account: "حساب من",
    myPrep: "آمادگی من",
    email: "ایمیل",
    language: "زبان",
    targetYear: "سال هدف کانکور",
    level: "سطح آمادگی",
    edit: "ویرایش پروفایل",
    save: "ذخیره تغییرات",
    cancel: "لغو",
    notSet: "تعیین نشده",
    starting: "تازه شروع کرده‌ام",
    some: "کمی آمادگی دارم",
    intensive: "آمادگی جدی",
    saved: "تغییرات پروفایل ذخیره شد.",
    saveError: "تغییرات ذخیره نشد. دوباره تلاش کنید.",
    subscription: "اشتراک",
    activePlan: "پلن فعال",
    currentPlan: "پلن فعلی",
    active: "فعال",
    free: "رایگان",
    premium: "Premium",
    comparePlans: "مقایسه پلن‌ها",
    feature: "ویژگی",
    upgradePremium: "ارتقا به Premium",
    managePremium: "مدیریت Premium",
    renewsUntil: "فعال تا",
    cancelScheduled: "لغو در پایان دوره فعال است",
    perDay: "در روز",
    questions: "سوال روزانه",
    targetedSize: "حداکثر سوال در تمرین هدفمند",
    fullKankor: "کانکور کامل",
    historical: "آرشیف تاریخی",
    explanations: "توضیحات و راه‌حل کامل",
    analytics: "تحلیل و تاریخچه کامل",
    mistakes: "دفترچه اشتباهات",
    weaknessPractice: "تمرین نقاط ضعف",
    selectedForms: "فورم‌های منتخب",
    basic: "پایه",
    shortOnly: "توضیح کوتاه",
    noFreeLimit: "بدون محدودیت پلن رایگان",
    included: "دارد",
    notIncluded: "ندارد",
    accountActions: "حساب و امنیت",
    logout: "خروج از حساب",
    appInfo: "درباره برنامه",
    version: "نسخه برنامه",
    danger: "منطقه خطر",
    dangerBody: "حذف حساب تمام اطلاعات مربوط به این حساب را حذف می‌کند و قابل برگشت نیست.",
    delete: "حذف حساب"
  },
  ps: {
    title: "پروفایل",
    account: "زما حساب",
    myPrep: "زما چمتووالی",
    email: "برېښنالیک",
    language: "ژبه",
    targetYear: "د کانکور هدف کال",
    level: "د چمتووالي کچه",
    edit: "پروفایل سمول",
    save: "بدلونونه خوندي کړئ",
    cancel: "لغوه",
    notSet: "نه دی ټاکل شوی",
    starting: "اوس پیل کوم",
    some: "یو څه چمتووالی لرم",
    intensive: "جدي چمتووالی",
    saved: "د پروفایل بدلونونه خوندي شول.",
    saveError: "بدلونونه خوندي نه شول. بیا هڅه وکړئ.",
    subscription: "ګډون",
    activePlan: "فعال پلان",
    currentPlan: "اوسنی پلان",
    active: "فعال",
    free: "وړیا",
    premium: "Premium",
    comparePlans: "پلانونه پرتله کړئ",
    feature: "ځانګړنه",
    upgradePremium: "Premium ته لوړول",
    managePremium: "Premium اداره کړئ",
    renewsUntil: "تر دې نېټې فعال",
    cancelScheduled: "د دورې په پای کې لغوه کېږي",
    perDay: "په ورځ",
    questions: "ورځنۍ پوښتنې",
    targetedSize: "په هدفمند تمرین کې د پوښتنو اعظمي شمېر",
    fullKankor: "بشپړ کانکور",
    historical: "تاریخي آرشیف",
    explanations: "بشپړ تشریح او حل",
    analytics: "بشپړ تحلیل او تاریخچه",
    mistakes: "د تېروتنو کتابچه",
    weaknessPractice: "د کمزورو برخو تمرین",
    selectedForms: "ټاکل شوې فورمې",
    basic: "بنسټیز",
    shortOnly: "لنډه تشریح",
    noFreeLimit: "د وړیا پلان محدودیت نه لري",
    included: "شته",
    notIncluded: "نشته",
    accountActions: "حساب او امنیت",
    logout: "له حسابه وتل",
    appInfo: "د اپ په اړه",
    version: "د اپ نسخه",
    danger: "خطرناکه برخه",
    dangerBody: "د حساب ړنګول د دې حساب معلومات حذف کوي او بېرته نه راګرځي.",
    delete: "حساب ړنګول"
  },
  en: {
    title: "Profile",
    account: "My account",
    myPrep: "My preparation",
    email: "Email",
    language: "Language",
    targetYear: "Target Kankor year",
    level: "Preparation level",
    edit: "Edit profile",
    save: "Save changes",
    cancel: "Cancel",
    notSet: "Not set",
    starting: "Just starting",
    some: "Some preparation",
    intensive: "Intensive preparation",
    saved: "Profile changes saved.",
    saveError: "Changes could not be saved. Try again.",
    subscription: "Subscription",
    activePlan: "Active plan",
    currentPlan: "Current plan",
    active: "Active",
    free: "Free",
    premium: "Premium",
    comparePlans: "Compare plans",
    feature: "Feature",
    upgradePremium: "Upgrade to Premium",
    managePremium: "Manage Premium",
    renewsUntil: "Active until",
    cancelScheduled: "Cancellation is scheduled for the end of the period",
    perDay: "per day",
    questions: "Daily questions",
    targetedSize: "Max questions per targeted exam",
    fullKankor: "Full Kankor",
    historical: "Historical archive",
    explanations: "Full explanations & worked solutions",
    analytics: "Complete analytics & history",
    mistakes: "Mistake notebook",
    weaknessPractice: "Weakness practice",
    selectedForms: "Selected forms",
    basic: "Basic",
    shortOnly: "Short explanation",
    noFreeLimit: "No Free-plan limit",
    included: "Included",
    notIncluded: "Not included",
    accountActions: "Account & security",
    logout: "Log out",
    appInfo: "About the app",
    version: "App version",
    danger: "Danger zone",
    dangerBody: "Deleting your account removes the data connected to this account and cannot be undone.",
    delete: "Delete account"
  }
} as const;

export default function ProfileScreen() {
  const { user, token, updateProfile, logout, deleteAccount } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";
  const rowDirection = "row";

  const [editing, setEditing] = useState(false);
  const [draftLanguage, setDraftLanguage] = useState<SupportedLocale>(user?.preferredLanguage ?? locale);
  const [draftYear, setDraftYear] = useState(user?.targetExamYear ?? 1406);
  const [draftLevel, setDraftLevel] = useState<string | null>(user?.preparationLevel ?? null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"" | "saved" | "error">("");
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [comparison, setComparison] = useState<SubscriptionComparison | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    if (!token) return;
    setPlanLoading(true);
    try {
      const [subscriptionResult, comparisonResult] = await Promise.all([
        apiRequest<SubscriptionState>("/subscription", {}, token),
        apiRequest<SubscriptionComparison>("/subscription/comparison", {}, token)
      ]);
      setSubscription(subscriptionResult);
      setComparison(comparisonResult);
    } catch {
      setSubscription(null);
      setComparison(null);
    } finally {
      setPlanLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    void loadSubscription();
  }, [loadSubscription]));

  const initials = useMemo(() => {
    const local = user?.email?.split("@")[0] ?? "?";
    return local.slice(0, 2).toUpperCase();
  }, [user?.email]);

  const planLabel = useMemo(() => {
    if (!subscription) return "—";
    if (subscription.tier === "free") return text.free;
    const plan = subscription.subscription;
    if (!plan) return text.premium;
    if (locale === "ps") return plan.planNamePs || plan.planNameFa || text.premium;
    if (locale === "en") return plan.planNameEn || plan.planNameFa || text.premium;
    return plan.planNameFa || text.premium;
  }, [subscription, locale, text.free, text.premium]);

  function preparationLabel(level: string | null) {
    if (level === "starting") return text.starting;
    if (level === "some_preparation") return text.some;
    if (level === "intensive") return text.intensive;
    return text.notSet;
  }

  function entitlementNumber(key: string, fallback = 0) {
    const source = comparison?.free
      ?? (subscription?.tier === "free" ? subscription.entitlements : null);
    const value = Number(source?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  const planComparison = [
    {
      label: text.questions,
      free: `${entitlementNumber("dailyQuestionAllowance", 50)} ${text.perDay}`,
      premium: text.noFreeLimit
    },
    {
      label: text.targetedSize,
      free: String(entitlementNumber("maxQuestionsPerTargetedExam", 10)),
      premium: text.noFreeLimit
    },
    {
      label: text.fullKankor,
      free: entitlementNumber("fullKankorPerDay", 0) > 0
        ? `${entitlementNumber("fullKankorPerDay")} ${text.perDay}`
        : text.notIncluded,
      premium: text.included
    },
    {
      label: text.historical,
      free: entitlementNumber("historicalFormsPerDay", 1) > 0
        ? `${text.selectedForms} · ${entitlementNumber("historicalFormsPerDay", 1)} ${text.perDay}`
        : text.notIncluded,
      premium: text.included
    },
    {
      label: text.explanations,
      free: text.shortOnly,
      premium: text.included
    },
    {
      label: text.analytics,
      free: text.basic,
      premium: text.included
    },
    {
      label: text.mistakes,
      free: text.notIncluded,
      premium: text.included
    },
    {
      label: text.weaknessPractice,
      free: text.notIncluded,
      premium: text.included
    }
  ];

  function startEditing() {
    setDraftLanguage(user?.preferredLanguage ?? locale);
    setDraftYear(user?.targetExamYear ?? 1406);
    setDraftLevel(user?.preparationLevel ?? null);
    setStatus("");
    setEditing(true);
  }

  function cancelEditing() {
    setStatus("");
    setEditing(false);
  }

  async function saveProfile() {
    setSaving(true);
    setStatus("");
    try {
      await updateProfile({
        preferredLanguage: draftLanguage,
        targetExamYear: draftYear,
        preparationLevel: draftLevel
      });
      setEditing(false);
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await logout();
    router.replace("/(auth)/welcome");
  }

  function confirmDelete() {
    Alert.alert(text.delete, text.dangerBody, [
      { text: text.cancel, style: "cancel" },
      {
        text: text.delete,
        style: "destructive",
        onPress: () => void deleteAccount().then(() => router.replace("/(auth)/welcome"))
      }
    ]);
  }

  const version = Constants.expoConfig?.version ?? "0.4.0";
  const isPremium = subscription?.tier === "premium";
  const isFree = subscription?.tier === "free";

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.title}</Text>

      <View style={styles.identityCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={[styles.email, { textAlign: align, writingDirection: direction }]} numberOfLines={1}>{user?.email}</Text>
          <Pressable style={[styles.planPill, isPremium && styles.planPillPremium]} onPress={() => router.push("/premium")}>
            <Ionicons name={isPremium ? "diamond-outline" : "person-circle-outline"} size={15} color={isPremium ? theme.colors.primary : theme.colors.mutedText} />
            {planLoading
              ? <ActivityIndicator size="small" color={theme.colors.primary} />
              : <Text style={[styles.planPillText, isPremium && styles.planPillTextPremium]} numberOfLines={1}>{planLabel}</Text>}
          </Pressable>
        </View>
      </View>

      {status ? (
        <Text style={[status === "saved" ? styles.success : styles.error, { textAlign: align, writingDirection: direction }]}>
          {status === "saved" ? text.saved : text.saveError}
        </Text>
      ) : null}

      <View style={styles.card}>
        <View style={[styles.cardTitleRow, { flexDirection: rowDirection }]}>
          <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.myPrep}</Text>
          {!editing ? (
            <Pressable accessibilityRole="button" style={styles.editButton} onPress={startEditing}>
              <Ionicons name="create-outline" size={17} color={theme.colors.primary} />
              <Text style={styles.editButtonText}>{text.edit}</Text>
            </Pressable>
          ) : null}
        </View>

        {!editing ? (
          <View style={styles.rows}>
            <InfoRow icon="language-outline" label={text.language} value={localeMeta[user?.preferredLanguage ?? locale].label} direction={direction} />
            <InfoRow icon="calendar-outline" label={text.targetYear} value={String(user?.targetExamYear ?? "—")} direction={direction} />
            <InfoRow icon="speedometer-outline" label={text.level} value={preparationLabel(user?.preparationLevel ?? null)} direction={direction} />
          </View>
        ) : (
          <View style={styles.editor}>
            <Text style={[styles.fieldLabel, { textAlign: align, writingDirection: direction }]}>{text.language}</Text>
            <View style={[styles.chips, { flexDirection: rowDirection }]}>
              {languages.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setDraftLanguage(item)}
                  style={[styles.chip, draftLanguage === item && styles.chipActive]}
                >
                  <Text style={draftLanguage === item ? styles.chipTextActive : styles.chipText}>{localeMeta[item].label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { textAlign: align, writingDirection: direction }]}>{text.targetYear}</Text>
            <View style={[styles.chips, { flexDirection: rowDirection }]}>
              {years.map((item) => (
                <Pressable key={item} onPress={() => setDraftYear(item)} style={[styles.chip, draftYear === item && styles.chipActive]}>
                  <Text style={draftYear === item ? styles.chipTextActive : styles.chipText}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { textAlign: align, writingDirection: direction }]}>{text.level}</Text>
            <View style={styles.levels}>
              {levels.map((item) => {
                const key = item ?? "none";
                const label = preparationLabel(item);
                return (
                  <Pressable
                    key={key}
                    onPress={() => setDraftLevel(item)}
                    style={[styles.levelOption, draftLevel === item && styles.levelActive]}
                  >
                    <Text style={[styles.levelText, draftLevel === item && styles.levelTextActive, { textAlign: align, writingDirection: direction }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.editorActions}>
              <AppButton label={text.save} loading={saving} onPress={() => void saveProfile()} />
              <AppButton label={text.cancel} variant="secondary" disabled={saving} onPress={cancelEditing} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.subscription}</Text>

        <View style={[styles.activePlanCard, isPremium && styles.activePlanCardPremium]}>
          <View style={[styles.activePlanTop, { flexDirection: rowDirection }]}>
            <View style={[styles.activePlanIcon, isPremium && styles.activePlanIconPremium]}>
              <Ionicons
                name={isPremium ? "diamond-outline" : "card-outline"}
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.infoCopy}>
              <Text style={[styles.infoLabel, { textAlign: align, writingDirection: direction }]}>{text.activePlan}</Text>
              {planLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.activePlanName, { textAlign: align, writingDirection: direction }]}>{planLabel}</Text>
              )}
            </View>
            {!planLoading && subscription ? (
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark-circle" size={15} color={theme.colors.success} />
                <Text style={styles.activeBadgeText}>{text.active}</Text>
              </View>
            ) : null}
          </View>

          {isPremium && subscription?.subscription?.currentPeriodEnd ? (
            <Text style={[styles.meta, { textAlign: align, writingDirection: direction }]}>
              {text.renewsUntil}: {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
            </Text>
          ) : null}
          {isPremium && subscription?.subscription?.cancelAtPeriodEnd ? (
            <Text style={[styles.warning, { textAlign: align, writingDirection: direction }]}>{text.cancelScheduled}</Text>
          ) : null}
        </View>

        <View style={styles.comparisonCard}>
          <Text style={[styles.comparisonTitle, { textAlign: align, writingDirection: direction }]}>{text.comparePlans}</Text>

          <View style={styles.comparisonHeader}>
            <View style={styles.featureColumn}>
              <Text style={[styles.comparisonHeaderText, { textAlign: align, writingDirection: direction }]}>{text.feature}</Text>
            </View>
            <View style={[styles.planColumn, isFree && styles.currentPlanColumn]}>
              <Text style={[styles.comparisonHeaderText, isFree && styles.currentPlanText]}>{text.free}</Text>
            </View>
            <View style={[styles.planColumn, isPremium && styles.currentPlanColumn]}>
              <Text style={[styles.comparisonHeaderText, isPremium && styles.currentPlanText]}>{text.premium}</Text>
            </View>
          </View>

          {planComparison.map((item) => (
            <View key={item.label} style={styles.comparisonRow}>
              <View style={styles.featureColumn}>
                <Text style={[styles.featureLabel, { textAlign: align, writingDirection: direction }]}>{item.label}</Text>
              </View>
              <View style={[styles.planColumn, isFree && styles.currentPlanColumnSoft]}>
                <Text style={[styles.planValue, { textAlign: "center", writingDirection: direction }]}>{item.free}</Text>
              </View>
              <View style={[styles.planColumn, isPremium && styles.currentPlanColumnSoft]}>
                <View style={styles.includedValue}>
                  {item.premium === text.included ? (
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                  ) : null}
                  <Text style={[styles.planValue, isPremium && styles.currentPlanText, { textAlign: "center", writingDirection: direction }]}>
                    {item.premium}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <AppButton
          label={isPremium ? text.managePremium : text.upgradePremium}
          variant={isPremium ? "secondary" : "primary"}
          onPress={() => router.push("/premium")}
        />
      </View>

      <View style={styles.card}>
        <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.accountActions}</Text>
        <InfoRow icon="mail-outline" label={text.email} value={user?.email ?? "—"} direction={direction} />
        <AppButton label={text.logout} variant="secondary" onPress={() => void signOut()} />
      </View>

      <View style={styles.card}>
        <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.appInfo}</Text>
        <InfoRow icon="information-circle-outline" label={text.version} value={version} direction={direction} />
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.dangerTitle, { textAlign: align, writingDirection: direction }]}>{text.danger}</Text>
        <Text style={[styles.meta, { textAlign: align, writingDirection: direction }]}>{text.dangerBody}</Text>
        <AppButton label={text.delete} variant="danger" onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
  direction
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  direction: "rtl" | "ltr";
}) {
  const align = direction === "rtl" ? "right" : "left";
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={19} color={theme.colors.primary} /></View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { textAlign: align, writingDirection: direction }]}>{label}</Text>
        <Text style={[styles.infoValue, { textAlign: align, writingDirection: direction }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 140, gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "900" },
  identityCard: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  avatar: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 29, backgroundColor: theme.colors.primary },
  avatarText: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  identityCopy: { flex: 1, gap: 8 },
  email: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: "800" },
  planPill: { minHeight: 34, maxWidth: 180, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.pill, backgroundColor: theme.colors.background },
  planPillPremium: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  planPillText: { flexShrink: 1, color: theme.colors.mutedText, fontSize: theme.typography.small, fontWeight: "800" },
  planPillTextPremium: { color: theme.colors.primary },
  card: { gap: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  dangerCard: { borderColor: theme.colors.danger },
  cardTitleRow: { alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  sectionTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  dangerTitle: { color: theme.colors.danger, fontSize: theme.typography.heading, fontWeight: "800" },
  editButton: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft },
  editButtonText: { color: theme.colors.primary, fontSize: theme.typography.small, fontWeight: "800" },
  rows: { gap: theme.spacing.sm },
  infoRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm },
  infoIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: theme.colors.primarySoft },
  infoCopy: { flex: 1, gap: 3 },
  infoLabel: { color: theme.colors.mutedText, fontSize: theme.typography.small },
  infoValue: { color: theme.colors.text, fontWeight: "800" },
  editor: { gap: theme.spacing.md },
  fieldLabel: { color: theme.colors.text, fontWeight: "800" },
  chips: { flexWrap: "wrap", gap: theme.spacing.sm },
  chip: { minHeight: 42, minWidth: 58, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.pill, backgroundColor: theme.colors.background },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  chipText: { color: theme.colors.text, fontWeight: "600" },
  chipTextActive: { color: theme.colors.primary, fontWeight: "800" },
  levels: { gap: theme.spacing.sm },
  levelOption: { minHeight: 46, justifyContent: "center", paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  levelActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  levelText: { color: theme.colors.text, fontWeight: "600" },
  levelTextActive: { color: theme.colors.primary, fontWeight: "800" },
  editorActions: { gap: theme.spacing.sm },
  activePlanCard: { gap: theme.spacing.sm, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  activePlanCardPremium: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  activePlanTop: { alignItems: "center", gap: theme.spacing.sm },
  activePlanIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: theme.colors.surface },
  activePlanIconPremium: { backgroundColor: "#FFFFFF" },
  activePlanName: { color: theme.colors.text, fontSize: 19, fontWeight: "900" },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: theme.radius.pill, backgroundColor: "#ECFDF3" },
  activeBadgeText: { color: theme.colors.success, fontSize: 11, fontWeight: "800" },
  comparisonCard: { overflow: "hidden", borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  comparisonTitle: { padding: theme.spacing.md, color: theme.colors.text, fontSize: theme.typography.body, fontWeight: "800" },
  comparisonHeader: { flexDirection: "row", alignItems: "stretch", borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background },
  comparisonRow: { flexDirection: "row", alignItems: "stretch", minHeight: 66, borderTopWidth: 1, borderTopColor: theme.colors.border },
  featureColumn: { flex: 1.35, justifyContent: "center", padding: 9 },
  planColumn: { flex: 1, minWidth: 0, justifyContent: "center", alignItems: "center", padding: 7, borderLeftWidth: 1, borderLeftColor: theme.colors.border },
  currentPlanColumn: { backgroundColor: theme.colors.primarySoft },
  currentPlanColumnSoft: { backgroundColor: "#F8FAFF" },
  comparisonHeaderText: { color: theme.colors.mutedText, fontSize: 11, fontWeight: "800", textAlign: "center" },
  currentPlanText: { color: theme.colors.primary },
  featureLabel: { color: theme.colors.text, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  planValue: { color: theme.colors.mutedText, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  includedValue: { alignItems: "center", justifyContent: "center", gap: 3 },
  meta: { color: theme.colors.mutedText, fontSize: theme.typography.small, lineHeight: 21 },
  warning: { color: theme.colors.warning, fontSize: theme.typography.small, lineHeight: 21 },
  success: { color: theme.colors.success, fontWeight: "700" },
  error: { color: theme.colors.danger, fontWeight: "700" }
});

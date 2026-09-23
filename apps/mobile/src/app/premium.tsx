import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/screen";
import { ApiError, apiRequest } from "../lib/api";
import { useAuth } from "../providers/auth-provider";
import { useLocale } from "../providers/locale-provider";

type Plan = {
  id: string;
  code: string;
  nameFa: string;
  namePs: string | null;
  nameEn: string | null;
  billingPeriod: string;
  durationDays: number;
  priceAfn: number;
  entitlements: Record<string, unknown>;
};

type Entitlement = {
  tier: "free" | "premium";
  subscription: {
    id: string;
    status: string;
    planCode: string;
    planNameFa: string;
    planNamePs: string | null;
    planNameEn: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    provider: string;
  } | null;
  entitlements: Record<string, unknown>;
};

type Checkout = {
  paymentId: string;
  providerPaymentId: string;
  subscriptionId: string;
  status: string;
  amountAfn: number;
  provider: string;
  confirmationMode: string;
};

const copy = {
  fa: {
    title: "Premium",
    subtitle: "دسترسی عمیق‌تر، محدودیت کمتر و آرشیف کامل",
    current: "پلن فعلی",
    free: "رایگان",
    premium: "Premium",
    activeUntil: "فعال تا",
    cancelAtEnd: "لغو در پایان دوره",
    cancel: "لغو تمدید",
    choose: "انتخاب پلن",
    afn: "افغانی",
    days: "روز",
    checkout: "شروع پرداخت",
    confirmTest: "تایید پرداخت آزمایشی",
    pending: "پرداخت در انتظار تایید سرور است.",
    noPlans: "هنوز پلن فعالی در مدیریت تنظیم نشده است.",
    activated: "Premium فعال شد.",
    error: "عملیات پرداخت انجام نشد.",
    benefits: "مزایای Premium",
    benefitText: "آرشیف کامل تاریخی، آزمون‌های بیشتر، تحلیل کامل، راه‌حل‌ها، دفترچه اشتباهات و تمرین نقاط ضعف."
  },
  ps: {
    title: "Premium",
    subtitle: "ژور لاسرسی، لږ محدودیتونه او بشپړ آرشیف",
    current: "اوسنی پلان",
    free: "وړیا",
    premium: "Premium",
    activeUntil: "فعال تر",
    cancelAtEnd: "د دورې په پای کې لغوه",
    cancel: "تمدید لغوه کړئ",
    choose: "پلان وټاکئ",
    afn: "افغانۍ",
    days: "ورځې",
    checkout: "تادیه پیل کړئ",
    confirmTest: "ازمایښتي تادیه تایید کړئ",
    pending: "تادیه د سرور تایید ته منتظره ده.",
    noPlans: "تر اوسه فعال پلان نه دی تنظیم شوی.",
    activated: "Premium فعال شو.",
    error: "د تادیې عملیات ناکام شول.",
    benefits: "د Premium ګټې",
    benefitText: "بشپړ تاریخي آرشیف، ډېرې ازموینې، بشپړ تحلیل، حل لارې، د تېروتنو کتابچه او د کمزورو موضوعاتو تمرین."
  },
  en: {
    title: "Premium",
    subtitle: "Deeper access, higher limits, and the complete archive",
    current: "Current plan",
    free: "Free",
    premium: "Premium",
    activeUntil: "Active until",
    cancelAtEnd: "Cancels at period end",
    cancel: "Cancel renewal",
    choose: "Choose a plan",
    afn: "AFN",
    days: "days",
    checkout: "Start checkout",
    confirmTest: "Confirm test payment",
    pending: "Payment is waiting for server confirmation.",
    noPlans: "No active plans have been configured by an administrator yet.",
    activated: "Premium activated.",
    error: "The payment action failed.",
    benefits: "Premium benefits",
    benefitText: "Complete historical archive, higher exam limits, full analytics, worked solutions, Mistake Notebook, and weakness practice."
  }
} as const;

export default function PremiumScreen() {
  const { token } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";
  const rowDirection = "row";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [checkoutKeys] = useState(() => new Map<string, string>());

  const load = useCallback(async () => {
    if (!token) return;
    const [planResult, entitlementResult] = await Promise.all([
      apiRequest<{ items: Plan[] }>("/plans"),
      apiRequest<Entitlement>("/subscription", {}, token)
    ]);
    setPlans(planResult.items);
    setEntitlement(entitlementResult);
  }, [token]);

  useEffect(() => {
    void load().catch(() => setMessage(text.error));
  }, [load, text.error]);

  function planName(plan: Plan) {
    if (locale === "ps") return plan.namePs || plan.nameFa;
    if (locale === "en") return plan.nameEn || plan.nameFa;
    return plan.nameFa;
  }

  const activeName = useMemo(() => {
    const sub = entitlement?.subscription;
    if (!sub) return text.free;
    if (locale === "ps") return sub.planNamePs || sub.planNameFa;
    if (locale === "en") return sub.planNameEn || sub.planNameFa;
    return sub.planNameFa;
  }, [entitlement, locale, text.free]);

  async function startCheckout(plan: Plan) {
    if (!token || busy) return;
    setBusy(plan.id);
    setMessage("");
    try {
      let key = checkoutKeys.get(plan.id);
      if (!key) {
        key = `mobile:${plan.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        checkoutKeys.set(plan.id, key);
      }
      const result = await apiRequest<{ checkout: Checkout }>("/checkout", {
        method: "POST",
        body: JSON.stringify({ planId: plan.id, provider: "simulated", idempotencyKey: key })
      }, token);
      setCheckout(result.checkout);
      setMessage(text.pending);
    } catch (error) {
      setMessage(error instanceof ApiError && error.code === "subscription_already_active"
        ? text.premium
        : text.error);
    } finally {
      setBusy("");
    }
  }

  async function confirmSimulation() {
    if (!token || !checkout || busy) return;
    setBusy("confirm");
    try {
      await apiRequest("/billing/simulated/confirm", {
        method: "POST",
        body: JSON.stringify({ providerPaymentId: checkout.providerPaymentId })
      }, token);
      setCheckout(null);
      setMessage(text.activated);
      await load();
    } catch {
      setMessage(text.error);
    } finally {
      setBusy("");
    }
  }

  async function cancelSubscription() {
    if (!token || busy) return;
    setBusy("cancel");
    try {
      await apiRequest("/subscription/cancel", { method: "POST" }, token);
      await load();
    } catch {
      setMessage(text.error);
    } finally {
      setBusy("");
    }
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={[styles.header, { flexDirection: rowDirection }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name={direction === "rtl" ? "arrow-forward" : "arrow-back"} size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.title}</Text>
          <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.subtitle}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={[styles.kicker, { textAlign: align, writingDirection: direction }]}>{text.current}</Text>
        <Text style={[styles.heroTitle, { textAlign: align, writingDirection: direction }]}>{activeName}</Text>
        {entitlement?.subscription?.currentPeriodEnd ? (
          <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>
            {text.activeUntil}: {new Date(entitlement.subscription.currentPeriodEnd).toLocaleDateString()}
          </Text>
        ) : null}
        {entitlement?.subscription?.cancelAtPeriodEnd ? (
          <Text style={[styles.notice, { textAlign: align, writingDirection: direction }]}>{text.cancelAtEnd}</Text>
        ) : null}
        {entitlement?.tier === "premium" && !entitlement.subscription?.cancelAtPeriodEnd ? (
          <Pressable style={styles.secondaryButton} disabled={Boolean(busy)} onPress={() => void cancelSubscription()}>
            <Text style={styles.secondaryText}>{text.cancel}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.benefits}</Text>
        <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.benefitText}</Text>
      </View>

      {message ? <Text style={[styles.message, { textAlign: align, writingDirection: direction }]}>{message}</Text> : null}

      {checkout ? (
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.pending}</Text>
          <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{checkout.amountAfn} {text.afn}</Text>
          <Pressable style={styles.primaryButton} disabled={Boolean(busy)} onPress={() => void confirmSimulation()}>
            {busy === "confirm" ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{text.confirmTest}</Text>}
          </Pressable>
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.choose}</Text>
      {!plans.length ? <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.noPlans}</Text> : null}

      {plans.map((plan) => (
        <View style={styles.card} key={plan.id}>
          <View style={[styles.planTop, { flexDirection: rowDirection }]}>
            <View style={styles.planCopy}>
              <Text style={[styles.planName, { textAlign: align, writingDirection: direction }]}>{planName(plan)}</Text>
              <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{plan.durationDays} {text.days}</Text>
            </View>
            <Text style={styles.price}>{plan.priceAfn} {text.afn}</Text>
          </View>
          <Pressable
            style={styles.primaryButton}
            disabled={Boolean(busy) || entitlement?.tier === "premium"}
            onPress={() => void startCheckout(plan)}
          >
            {busy === plan.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{text.checkout}</Text>}
          </Pressable>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 80, gap: theme.spacing.md },
  header: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm },
  back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 5 },
  title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "900" },
  body: { color: theme.colors.mutedText, lineHeight: 24 },
  hero: { gap: 8, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft },
  kicker: { color: theme.colors.primary, fontWeight: "800" },
  heroTitle: { color: theme.colors.text, fontSize: 26, fontWeight: "900" },
  notice: { color: theme.colors.warning, fontWeight: "700" },
  card: { gap: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  sectionTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  planTop: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },
  planCopy: { flex: 1, gap: 4 },
  planName: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  price: { color: theme.colors.primary, fontSize: 18, fontWeight: "900" },
  primaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, backgroundColor: theme.colors.primary },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.primary },
  secondaryText: { color: theme.colors.primary, fontWeight: "800" },
  message: { color: theme.colors.primary, fontWeight: "700" }
});

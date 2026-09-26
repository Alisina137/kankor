import { theme } from "@kankor/config";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AuthProvider } from "../providers/auth-provider";
import { LocaleProvider, useLocale } from "../providers/locale-provider";

function ScreenErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { locale, direction } = useLocale();
  const copy = {
    fa: {
      title: "این صفحه با مشکل روبه‌رو شد",
      body: "می‌توانید دوباره تلاش کنید. اطلاعات حساب شما حذف نشده است.",
      retry: "تلاش دوباره"
    },
    ps: {
      title: "په دې پاڼه کې ستونزه رامنځته شوه",
      body: "بیا هڅه کولی شئ. ستاسو د حساب معلومات نه دي حذف شوي.",
      retry: "بیا هڅه"
    },
    en: {
      title: "This screen ran into a problem",
      body: "You can try again. Your account information has not been deleted.",
      retry: "Try again"
    }
  }[locale];
  const align = direction === "rtl" ? "right" : "left";

  return (
    <View style={styles.errorScreen}>
      <Text style={[styles.errorTitle, { textAlign: align, writingDirection: direction }]}>
        {copy.title}
      </Text>
      <Text style={[styles.errorBody, { textAlign: align, writingDirection: direction }]}>
        {copy.body}
      </Text>
      <Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => void retry()}>
        <Text style={styles.retryText}>{copy.retry}</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{ headerShown: false }}
          unstable_screenErrorBoundary={ScreenErrorBoundary}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="historical" />
          <Stack.Screen name="mistakes" />
          <Stack.Screen name="premium" />
          <Stack.Screen name="exam/[attemptId]" />
          <Stack.Screen name="result/[attemptId]" />
          <Stack.Screen name="review/[attemptId]" />
        </Stack>
      </AuthProvider>
    </LocaleProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    justifyContent: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background
  },
  errorTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: "800"
  },
  errorBody: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 25
  },
  retryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "800"
  }
});

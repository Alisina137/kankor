import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { theme } from "@kankor/config";
import { AppButton } from "../components/app-button";
import { hasSeenIntro } from "../lib/first-run-storage";
import { useAuth } from "../providers/auth-provider";
import { useLocale } from "../providers/locale-provider";

export default function EntryScreen() {
  const { user, loading, startupError, retrySession } = useAuth();
  const { direction, text } = useLocale();
  const [introLoading, setIntroLoading] = useState(true);
  const [introSeen, setIntroSeen] = useState(false);
  const align = direction === "rtl" ? "right" : "left";

  useEffect(() => {
    let active = true;
    void hasSeenIntro()
      .then((seen) => {
        if (active) setIntroSeen(seen);
      })
      .finally(() => {
        if (active) setIntroLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading || introLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (startupError) {
    return (
      <View style={[styles.center, styles.retry, { direction }]}>
        <Text style={[styles.message, { textAlign: align, writingDirection: direction }]}>
          {text.sessionCheckFailed}
        </Text>
        <AppButton label={text.retryConnection} onPress={() => void retrySession()} />
      </View>
    );
  }

  if (!user) return <Redirect href={introSeen ? "/(auth)/login" : "/(auth)/welcome"} />;
  if (!user.onboardingCompleted) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg
  },
  retry: {
    gap: theme.spacing.md
  },
  message: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 25,
    maxWidth: 420
  }
});

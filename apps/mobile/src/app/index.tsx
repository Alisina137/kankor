import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { theme } from "@kankor/config";
import { AppButton } from "../components/app-button";
import { useAuth } from "../providers/auth-provider";
import { useLocale } from "../providers/locale-provider";

export default function EntryScreen() {
  const { user, loading, startupError, retrySession } = useAuth();
  const { direction, text } = useLocale();
  const align = direction === "rtl" ? "right" : "left";

  if (loading) {
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

  if (!user) return <Redirect href="/(auth)/welcome" />;
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

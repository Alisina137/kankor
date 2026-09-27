import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router } from "expo-router";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "./app-text";
import { AuthIllustration } from "./auth-illustration";
import { Screen } from "./screen";
import { useLocale } from "../providers/locale-provider";

type IllustrationVariant =
  | "learn"
  | "practice"
  | "progress"
  | "account"
  | "security"
  | "language"
  | "target"
  | "level";

type AuthFormShellProps = PropsWithChildren<{
  title: string;
  body: string;
  illustration?: IllustrationVariant;
  footer?: React.ReactNode;
}>;

export function AuthFormShell({
  title,
  body,
  illustration = "account",
  children,
  footer
}: AuthFormShellProps) {
  const { direction } = useLocale();

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name={direction === "rtl" ? "arrow-forward" : "arrow-back"}
            size={21}
            color={theme.colors.text}
          />
        </Pressable>
      </View>

      <AuthIllustration variant={illustration} compact />

      <View style={styles.heading}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>

      <View style={styles.card}>
        {children}
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
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
    alignItems: "center"
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
  heading: {
    gap: theme.spacing.sm
  },
  title: {
    color: theme.colors.text,
    fontSize: 29,
    lineHeight: 37,
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
  footer: {
    alignItems: "center"
  }
});

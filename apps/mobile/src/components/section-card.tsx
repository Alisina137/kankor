import { theme } from "@kankor/config";
import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocale } from "../providers/locale-provider";

export function SectionCard({ title, children }: PropsWithChildren<{ title: string }>) {
  const { direction } = useLocale();
  const align = direction === "rtl" ? "right" : "left";

  return (
    <View style={styles.card}>
      <Text style={[styles.title, { textAlign: align }]}>{title}</Text>
      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: "700"
  }
});

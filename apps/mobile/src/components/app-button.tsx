import { theme } from "@kankor/config";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useLocale } from "../providers/locale-provider";

export function AppButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary"
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const blocked = disabled || loading;
  const { direction } = useLocale();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { direction },
        styles[variant],
        blocked && styles.disabled,
        pressed && !blocked && styles.pressed
      ]}
    >
      {loading
        ? <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : theme.colors.primary} />
        : <Text style={[styles.label, variant !== "primary" && styles.secondaryLabel, variant === "danger" && styles.dangerLabel, { writingDirection: direction }]}>{label}</Text>
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  danger: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.danger },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82 },
  label: { color: "#FFFFFF", fontWeight: "700", fontSize: theme.typography.body },
  secondaryLabel: { color: theme.colors.primary },
  dangerLabel: { color: theme.colors.danger }
});

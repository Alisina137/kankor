import { theme } from "@kankor/config";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useLocale } from "../providers/locale-provider";

export function FormField({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const { direction } = useLocale();
  const align = direction === "rtl" ? "right" : "left";

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { textAlign: align }]}>{label}</Text>
      <TextInput
        {...props}
        autoCapitalize={props.autoCapitalize ?? "none"}
        placeholderTextColor={theme.colors.mutedText}
        style={[styles.input, { textAlign: align }, error && styles.inputError, props.style]}
      />
      {error ? <Text style={[styles.error, { textAlign: align }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.sm },
  label: { color: theme.colors.text, fontWeight: "600" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.body
  },
  inputError: { borderColor: theme.colors.danger },
  error: { color: theme.colors.danger, fontSize: theme.typography.small }
});

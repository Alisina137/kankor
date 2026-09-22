import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useLocale } from "../providers/locale-provider";

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  secureToggle?: boolean;
};

export function FormField({
  label,
  error,
  secureToggle = false,
  secureTextEntry,
  ...props
}: FormFieldProps) {
  const { direction } = useLocale();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const align = direction === "rtl" ? "right" : "left";
  const shouldHidePassword = Boolean(secureTextEntry) && !passwordVisible;

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { textAlign: align }]}>{label}</Text>

      <View style={[styles.inputShell, error && styles.inputError]}>
        <TextInput
          {...props}
          autoCapitalize={props.autoCapitalize ?? "none"}
          placeholderTextColor={theme.colors.mutedText}
          secureTextEntry={shouldHidePassword}
          style={[styles.input, { textAlign: align }, props.style]}
        />

        {secureToggle && secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
            hitSlop={8}
            onPress={() => setPasswordVisible((current) => !current)}
            style={styles.visibilityButton}
          >
            <Ionicons
              name={passwordVisible ? "eye-off-outline" : "eye-outline"}
              size={21}
              color={theme.colors.mutedText}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={[styles.error, { textAlign: align }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.sm },
  label: { color: theme.colors.text, fontWeight: "600" },
  inputShell: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.body
  },
  visibilityButton: {
    width: 48,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center"
  },
  inputError: { borderColor: theme.colors.danger },
  error: { color: theme.colors.danger, fontSize: theme.typography.small }
});

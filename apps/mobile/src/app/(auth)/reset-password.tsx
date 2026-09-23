import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@kankor/config";
import { AppButton } from "../../components/app-button";
import { FormField } from "../../components/form-field";
import { Screen } from "../../components/screen";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const { direction, text } = useLocale();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const align = direction === "rtl" ? "right" : "left";

  async function submit() {
    setError("");
    if (password.length < 8) return setError(text.passwordLength);
    setBusy(true);
    try {
      await resetPassword(token, password);
      router.replace("/(auth)/login");
    } catch {
      setError(text.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.stack}>
        <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.resetTitle}</Text>
        <FormField label={text.resetToken} value={token} onChangeText={setToken} />
        <FormField label={text.newPassword} value={password} onChangeText={setPassword} secureTextEntry secureToggle />
        {error ? <Text style={[styles.error, { textAlign: align, writingDirection: direction }]}>{error}</Text> : null}
        <AppButton label={text.resetPassword} loading={busy} onPress={submit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.md, paddingTop: theme.spacing.xl },
  title: { fontSize: theme.typography.title, fontWeight: "800", color: theme.colors.text },
  error: { color: theme.colors.danger }
});

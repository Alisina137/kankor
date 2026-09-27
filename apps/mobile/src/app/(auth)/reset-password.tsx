import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { AppButton } from "../../components/app-button";
import { AppText as Text } from "../../components/app-text";
import { AuthFormShell } from "../../components/auth-form-shell";
import { FormField } from "../../components/form-field";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

const copy = {
  fa: {
    body: "کُد بازیابی را وارد کنید و یک رمز عبور جدید و امن برای حساب خود بسازید."
  },
  ps: {
    body: "د بېرته ترلاسه کولو کوډ ولیکئ او د خپل حساب لپاره نوی خوندي پټنوم جوړ کړئ."
  },
  en: {
    body: "Enter your recovery code and choose a new secure password for your account."
  }
} as const;

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const { locale, text } = useLocale();
  const local = copy[locale];
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (!token.trim()) return setError(text.required);
    if (password.length < 8) return setError(text.passwordLength);

    setBusy(true);
    try {
      await resetPassword(token, password);
      router.replace("/(auth)/login");
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "";
      setError(
        code === "invalid_or_expired_reset_token" ? text.invalidResetToken
          : code === "rate_limited" ? text.rateLimited
            : code === "network_error" ? text.networkError
              : code === "server_error" ? text.serverError
                : text.genericError
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFormShell
      title={text.resetTitle}
      body={local.body}
      illustration="security"
    >
      <FormField label={text.resetToken} value={token} onChangeText={setToken} />
      <FormField
        label={text.newPassword}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        secureToggle
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton label={text.resetPassword} loading={busy} onPress={submit} />
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20
  }
});

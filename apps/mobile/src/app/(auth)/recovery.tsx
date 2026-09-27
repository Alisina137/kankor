import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppButton } from "../../components/app-button";
import { AppText as Text } from "../../components/app-text";
import { AuthFormShell } from "../../components/auth-form-shell";
import { FormField } from "../../components/form-field";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

const copy = {
  fa: {
    body: "ایمیل حساب خود را وارد کنید. اگر حساب موجود باشد، روند بازیابی برای شما ایجاد می‌شود."
  },
  ps: {
    body: "خپل د حساب برېښنالیک ولیکئ. که حساب موجود وي، د بېرته ترلاسه کولو بهیر به جوړ شي."
  },
  en: {
    body: "Enter your account email. If the account exists, a secure recovery flow will be created."
  }
} as const;

export default function RecoveryScreen() {
  const { requestRecovery } = useAuth();
  const { locale, text } = useLocale();
  const local = copy[locale];
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMessage("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMessage(text.invalidEmail);

    setBusy(true);
    try {
      const result = await requestRecovery(email);
      setMessage(
        result.developmentToken
          ? `${text.recoveryAccepted}\n${text.resetToken}: ${result.developmentToken}`
          : text.recoveryAccepted
      );
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "";
      setMessage(
        code === "rate_limited" ? text.rateLimited
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
      title={text.recoveryTitle}
      body={local.body}
      illustration="security"
    >
      <FormField
        label={text.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <AppButton label={text.sendRecovery} loading={busy} onPress={submit} />

      {message ? (
        <View style={styles.messageCard}>
          <Text style={styles.message}>{message}</Text>
        </View>
      ) : null}

      <AppButton
        label={text.resetTitle}
        variant="secondary"
        onPress={() => router.push("/(auth)/reset-password")}
      />
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  messageCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft
  },
  message: {
    color: theme.colors.text,
    lineHeight: 23
  }
});

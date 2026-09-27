import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { AppButton } from "../../components/app-button";
import { AppText as Text } from "../../components/app-text";
import { AuthFormShell } from "../../components/auth-form-shell";
import { FormField } from "../../components/form-field";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

const copy = {
  fa: {
    body: "حساب خود را بسازید تا پیشرفت، آزمون‌ها و تنظیمات آمادگی شما محفوظ بماند.",
    haveAccount: "قبلاً حساب دارید؟"
  },
  ps: {
    body: "خپل حساب جوړ کړئ تر څو ستاسو پرمختګ، ازموینې او د چمتووالي تنظیمات خوندي پاتې شي.",
    haveAccount: "له مخکې حساب لرئ؟"
  },
  en: {
    body: "Create your account so your progress, exams, and preparation settings stay with you.",
    haveAccount: "Already have an account?"
  }
} as const;

export default function RegisterScreen() {
  const { register } = useAuth();
  const { locale, text } = useLocale();
  const local = copy[locale];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(text.invalidEmail);
    if (password.length < 8) return setError(text.passwordLength);
    if (password !== confirm) return setError(text.passwordMismatch);

    setBusy(true);
    try {
      await register(email, password);
      router.replace("/onboarding");
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      setError(
        code === "email_already_registered" ? text.emailExists
          : code === "invalid_registration_data" ? text.invalidRegistration
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
      title={text.createAccount}
      body={local.body}
      illustration="learn"
      footer={(
        <Pressable onPress={() => router.push("/(auth)/login")} style={styles.switchLink}>
          <Text style={styles.switchMuted}>{local.haveAccount}</Text>
          <Text style={styles.switchStrong}> {text.signIn}</Text>
        </Pressable>
      )}
    >
      <FormField
        label={text.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FormField
        label={text.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        secureToggle
        autoComplete="new-password"
      />
      <FormField
        label={text.confirmPassword}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        secureToggle
        autoComplete="new-password"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton label={text.createAccount} loading={busy} onPress={submit} />
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20
  },
  switchLink: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  switchMuted: {
    color: theme.colors.mutedText,
    textAlign: "center"
  },
  switchStrong: {
    color: theme.colors.primary,
    fontWeight: "900",
    textAlign: "center"
  }
});

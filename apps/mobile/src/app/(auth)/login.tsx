import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppButton } from "../../components/app-button";
import { AppText as Text } from "../../components/app-text";
import { AuthFormShell } from "../../components/auth-form-shell";
import { FormField } from "../../components/form-field";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

const copy = {
  fa: {
    body: "به حساب خود برگردید و آمادگی کانکور را از همان‌جایی که بودید ادامه دهید.",
    noAccount: "حساب ندارید؟"
  },
  ps: {
    body: "خپل حساب ته بېرته ننوځئ او د کانکور چمتووالی له هماغه ځایه ادامه ورکړئ.",
    noAccount: "حساب نه لرئ؟"
  },
  en: {
    body: "Return to your account and continue your Kankor preparation where you left off.",
    noAccount: "New to KankorPrep?"
  }
} as const;

export default function LoginScreen() {
  const { login } = useAuth();
  const { locale, text } = useLocale();
  const local = copy[locale];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (!email.trim() || !password) return setError(text.required);
    setBusy(true);
    try {
      const user = await login(email, password);
      router.replace(
        user.onboardingCompleted
          ? { pathname: "/(tabs)", params: { welcome: "back" } }
          : "/onboarding"
      );
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      setError(
        code === "invalid_credentials" ? text.invalidCredentials
          : code === "invalid_login_data" ? text.invalidLogin
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
      title={text.signIn}
      body={local.body}
      illustration="account"
      footer={(
        <Pressable onPress={() => router.push("/(auth)/register")} style={styles.switchLink}>
          <Text style={styles.switchMuted}>{local.noAccount}</Text>
          <Text style={styles.switchStrong}> {text.createAccount}</Text>
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
        autoComplete="current-password"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton label={text.signIn} loading={busy} onPress={submit} />

      <Pressable
        onPress={() => router.push("/(auth)/recovery")}
        style={styles.forgotButton}
      >
        <Text style={styles.forgotText}>{text.forgotPassword}</Text>
      </Pressable>
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20
  },
  forgotButton: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  forgotText: {
    color: theme.colors.primary,
    fontWeight: "800",
    textAlign: "center"
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

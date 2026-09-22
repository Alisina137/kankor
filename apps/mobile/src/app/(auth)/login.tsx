import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@kankor/config";
import { AppButton } from "../../components/app-button";
import { FormField } from "../../components/form-field";
import { Screen } from "../../components/screen";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

export default function LoginScreen() {
  const { login } = useAuth();
  const { direction, text } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const align = direction === "rtl" ? "right" : "left";

  async function submit() {
    setError("");
    if (!email.trim() || !password) return setError(text.required);
    setBusy(true);
    try {
      const user = await login(email, password);
      router.replace(user.onboardingCompleted ? "/(tabs)" : "/onboarding");
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      setError(code === "invalid_credentials" ? text.invalidCredentials : code === "network_error" ? text.networkError : text.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.stack}>
        <Text style={[styles.title, { textAlign: align }]}>{text.signIn}</Text>
        <FormField label={text.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
        <FormField label={text.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
        {error ? <Text style={[styles.error, { textAlign: align }]}>{error}</Text> : null}
        <AppButton label={text.signIn} loading={busy} onPress={submit} />
        <Pressable onPress={() => router.push("/(auth)/recovery")}><Text style={styles.link}>{text.forgotPassword}</Text></Pressable>
        <Pressable onPress={() => router.push("/(auth)/register")}><Text style={styles.link}>{text.noAccount} {text.createAccount}</Text></Pressable>
      </View>
    </Screen>
  );
}
const styles=StyleSheet.create({stack:{gap:theme.spacing.md,paddingTop:theme.spacing.xl},title:{fontSize:theme.typography.title,fontWeight:"800",color:theme.colors.text,marginBottom:theme.spacing.md},error:{color:theme.colors.danger},link:{color:theme.colors.primary,textAlign:"center",padding:theme.spacing.sm}});

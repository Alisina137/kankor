import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@kankor/config";
import { AppButton } from "../../components/app-button";
import { Screen } from "../../components/screen";
import { useLocale } from "../../providers/locale-provider";

export default function WelcomeScreen() {
  const { direction, text } = useLocale();
  const align = direction === "rtl" ? "right" : "left";

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.copy}>
          <Text style={[styles.brand, { textAlign: align }]}>{text.appName}</Text>
          <Text style={[styles.title, { textAlign: align }]}>{text.welcomeTitle}</Text>
          <Text style={[styles.body, { textAlign: align }]}>{text.welcomeBody}</Text>
        </View>
        <View style={styles.actions}>
          <AppButton label={text.createAccount} onPress={() => router.push("/(auth)/register")} />
          <AppButton label={text.signIn} variant="secondary" onPress={() => router.push("/(auth)/login")} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", paddingVertical: theme.spacing.xl },
  copy: { gap: theme.spacing.md, marginTop: theme.spacing.xl },
  brand: { color: theme.colors.primary, fontWeight: "800" },
  title: { color: theme.colors.text, fontSize: 34, lineHeight: 44, fontWeight: "800" },
  body: { color: theme.colors.mutedText, fontSize: theme.typography.body, lineHeight: 27 },
  actions: { gap: theme.spacing.md }
});

import { theme } from "@kankor/config";
import { router } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../components/app-button";
import { Screen } from "../../components/screen";
import { SectionCard } from "../../components/section-card";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

export default function ProfileScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const { direction, text } = useLocale();
  const align = direction === "rtl" ? "right" : "left";

  async function signOut() {
    await logout();
    router.replace("/(auth)/welcome");
  }

  function confirmDelete() {
    Alert.alert(text.deleteAccount, text.deleteConfirm, [
      { text: text.cancel, style: "cancel" },
      {
        text: text.delete,
        style: "destructive",
        onPress: () => void deleteAccount().then(() => router.replace("/(auth)/welcome"))
      }
    ]);
  }

  return (
    <Screen>
      <View style={styles.stack}>
        <SectionCard title={text.account}>
          <Text style={[styles.email, { textAlign: align }]}>{user?.email}</Text>
          <Text style={[styles.meta, { textAlign: align }]}>{text.targetLabel}: {user?.targetExamYear ?? "—"}</Text>
        </SectionCard>
        <AppButton label="Premium" onPress={() => router.push("/premium")} />
        <AppButton label={text.logout} variant="secondary" onPress={() => void signOut()} />
        <AppButton label={text.deleteAccount} variant="danger" onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.md },
  email: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: "600" },
  meta: { color: theme.colors.mutedText, marginTop: theme.spacing.sm }
});

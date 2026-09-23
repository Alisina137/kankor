import { theme } from "@kankor/config";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/screen";
import { SectionCard } from "../../components/section-card";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

export default function HomeScreen() {
  const { user } = useAuth();
  const { direction, text } = useLocale();
  const align = direction === "rtl" ? "right" : "left";

  return (
    <Screen>
      <View style={styles.stack}>
        <View>
          <Text style={[styles.appName, { textAlign: align, writingDirection: direction }]}>{text.appName}</Text>
          <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.homeTitle}</Text>
        </View>

        <SectionCard title={text.targetLabel}>
          <Text style={[styles.target, { textAlign: align, writingDirection: direction }]}>{user?.targetExamYear ?? "—"}</Text>
          <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.homeBody}</Text>
        </SectionCard>

        <SectionCard title={text.account}>
          <Text style={[styles.email, { textAlign: align, writingDirection: direction }]}>{user?.email}</Text>
        </SectionCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.lg },
  appName: { color: theme.colors.primary, fontSize: theme.typography.small, fontWeight: "700" },
  title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "800", marginTop: theme.spacing.xs },
  target: { color: theme.colors.primary, fontSize: 34, fontWeight: "800" },
  body: { color: theme.colors.mutedText, fontSize: theme.typography.body, lineHeight: 26 },
  email: { color: theme.colors.text, fontSize: theme.typography.body }
});

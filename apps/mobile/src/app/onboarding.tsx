import { localeMeta, theme, type SupportedLocale } from "@kankor/config";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../components/app-button";
import { Screen } from "../components/screen";
import { useAuth } from "../providers/auth-provider";
import { useLocale } from "../providers/locale-provider";

const years = [1405, 1406, 1407, 1408, 1409, 1410];
const levels = ["starting", "some_preparation", "intensive"] as const;

export default function OnboardingScreen() {
  const { user, loading, completeOnboarding } = useAuth();
  const { locale, setLocale, direction, text } = useLocale();
  const [year, setYear] = useState(user?.targetExamYear ?? 1406);
  const [level, setLevel] = useState<string | null>(user?.preparationLevel ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const align = direction === "rtl" ? "right" : "left";
  const rowDirection = "row";

  if (!loading && !user) return <Redirect href="/(auth)/welcome" />;
  if (user?.onboardingCompleted) return <Redirect href="/(tabs)" />;

  async function finish() {
    setBusy(true);
    setError("");
    try {
      await completeOnboarding({
        preferredLanguage: locale,
        targetExamYear: year,
        preparationLevel: level
      });
      router.replace("/(tabs)");
    } catch {
      setError(text.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.stack}>
        <View style={styles.copy}>
          <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.onboardingTitle}</Text>
          <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.onboardingBody}</Text>
        </View>

        <Text style={[styles.label, { textAlign: align, writingDirection: direction }]}>{text.language}</Text>
        <View style={[styles.row, { flexDirection: rowDirection }]}>
          {(["fa", "ps"] as SupportedLocale[]).map((item) => (
            <Pressable key={item} onPress={() => setLocale(item)} style={[styles.chip, locale === item && styles.active]}>
              <Text style={locale === item ? styles.activeText : styles.chipText}>{localeMeta[item].label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { textAlign: align, writingDirection: direction }]}>{text.targetYear}</Text>
        <View style={[styles.row, { flexDirection: rowDirection }]}>
          {years.map((item) => (
            <Pressable key={item} onPress={() => setYear(item)} style={[styles.chip, year === item && styles.active]}>
              <Text style={year === item ? styles.activeText : styles.chipText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { textAlign: align, writingDirection: direction }]}>{text.preparationLevel}</Text>
        <View style={styles.levels}>
          {levels.map((item) => {
            const label = item === "starting" ? text.starting : item === "some_preparation" ? text.somePreparation : text.intensive;
            return (
              <Pressable key={item} onPress={() => setLevel(level === item ? null : item)} style={[styles.level, level === item && styles.active]}>
                <Text style={[styles.chipText, level === item && styles.activeText, { textAlign: align, writingDirection: direction }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.note, { textAlign: align, writingDirection: direction }]}>{text.diagnosticLater}</Text>
        {error ? <Text style={[styles.error, { textAlign: align, writingDirection: direction }]}>{error}</Text> : null}
        <AppButton label={text.continue} loading={busy} onPress={finish} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.md, paddingVertical: theme.spacing.lg },
  copy: { gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  title: { fontSize: theme.typography.title, fontWeight: "800", color: theme.colors.text },
  body: { color: theme.colors.mutedText, lineHeight: 25 },
  label: { fontWeight: "700", color: theme.colors.text, marginTop: theme.spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  chip: { minHeight: 44, minWidth: 64, paddingHorizontal: theme.spacing.md, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface },
  active: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.text, fontWeight: "600" },
  activeText: { color: theme.colors.primary, fontWeight: "700" },
  levels: { gap: theme.spacing.sm },
  level: { minHeight: 48, justifyContent: "center", paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  note: { color: theme.colors.mutedText, fontSize: theme.typography.small },
  error: { color: theme.colors.danger }
});

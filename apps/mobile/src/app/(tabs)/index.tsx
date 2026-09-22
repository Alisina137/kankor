import { localeMeta, supportedLocales, theme } from "@kankor/config";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/screen";
import { SectionCard } from "../../components/section-card";
import { useLocale } from "../../providers/locale-provider";

export default function HomeScreen() {
  const { locale, setLocale, direction, text } = useLocale();
  const align = direction === "rtl" ? "right" : "left";

  return (
    <Screen>
      <View style={styles.stack}>
        <View>
          <Text style={[styles.appName, { textAlign: align }]}>{text.appName}</Text>
          <Text style={[styles.subtitle, { textAlign: align }]}>{text.phaseTitle}</Text>
        </View>

        <SectionCard title={text.phaseTitle}>
          <Text style={[styles.body, { textAlign: align }]}>{text.phaseBody}</Text>
        </SectionCard>

        <SectionCard title={text.language}>
          <View style={[styles.languageRow, direction === "rtl" && styles.rtlRow]}>
            {supportedLocales.map((item) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: locale === item }}
                key={item}
                onPress={() => setLocale(item)}
                style={[
                  styles.languageButton,
                  locale === item && styles.languageButtonActive
                ]}
              >
                <Text style={locale === item ? styles.languageTextActive : styles.languageText}>
                  {localeMeta[item].label}
                </Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.lg },
  appName: {
    color: theme.colors.primary,
    fontSize: theme.typography.small,
    fontWeight: "700"
  },
  subtitle: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: "800",
    marginTop: theme.spacing.xs
  },
  body: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 26
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  rtlRow: { flexDirection: "row-reverse" },
  languageButton: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill
  },
  languageButtonActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary
  },
  languageText: { color: theme.colors.text, fontWeight: "600" },
  languageTextActive: { color: theme.colors.primary, fontWeight: "700" }
});

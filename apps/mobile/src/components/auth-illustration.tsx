import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { StyleSheet, View } from "react-native";
import { AppText as Text } from "./app-text";
import { useLocale } from "../providers/locale-provider";

type IllustrationVariant =
  | "learn"
  | "practice"
  | "progress"
  | "account"
  | "security"
  | "language"
  | "target"
  | "level";

const visual = {
  learn: { icon: "book-outline", accent: "sparkles-outline", badge: "A+" },
  practice: { icon: "create-outline", accent: "flash-outline", badge: "20" },
  progress: { icon: "stats-chart-outline", accent: "trophy-outline", badge: "92%" },
  account: { icon: "person-outline", accent: "shield-checkmark-outline", badge: "✓" },
  security: { icon: "lock-closed-outline", accent: "key-outline", badge: "•••" },
  language: { icon: "language-outline", accent: "chatbubble-ellipses-outline", badge: "دری" },
  target: { icon: "flag-outline", accent: "calendar-outline", badge: "1406" },
  level: { icon: "speedometer-outline", accent: "trending-up-outline", badge: "↑" }
} as const;

export function AuthIllustration({
  variant,
  compact = false
}: {
  variant: IllustrationVariant;
  compact?: boolean;
}) {
  const { direction } = useLocale();
  const item = visual[variant];

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={[styles.orb, styles.orbOne]} />
      <View style={[styles.orb, styles.orbTwo]} />

      <View style={[styles.card, compact && styles.cardCompact]}>
        <View style={styles.iconCircle}>
          <Ionicons name={item.icon} size={compact ? 34 : 46} color={theme.colors.primary} />
        </View>

        <View style={styles.lines}>
          <View style={[styles.line, styles.lineStrong]} />
          <View style={[styles.line, styles.lineMedium]} />
          <View style={[styles.line, styles.lineShort]} />
        </View>

        <View style={styles.miniCard}>
          <Ionicons name={item.accent} size={20} color={theme.colors.primary} />
          <Text style={[styles.badge, { writingDirection: direction }]}>{item.badge}</Text>
        </View>
      </View>

      <View style={styles.sparkle}>
        <Ionicons name="sparkles-outline" size={18} color={theme.colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 30,
    backgroundColor: "#EEF3FF"
  },
  wrapCompact: {
    height: 170,
    borderRadius: 24
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#DCE7FF"
  },
  orbOne: {
    width: 170,
    height: 170,
    top: -58,
    left: -34
  },
  orbTwo: {
    width: 126,
    height: 126,
    right: -30,
    bottom: -36,
    backgroundColor: "#E6ECF8"
  },
  card: {
    width: "78%",
    minHeight: 166,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: "#D9E3F8",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#13234A",
    shadowOpacity: 0.11,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  cardCompact: {
    width: "74%",
    minHeight: 118
  },
  iconCircle: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: theme.colors.primarySoft
  },
  lines: {
    marginTop: 16,
    gap: 8
  },
  line: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: "#E8EDF7"
  },
  lineStrong: { width: "82%" },
  lineMedium: { width: "64%" },
  lineShort: { width: "48%" },
  miniCard: {
    position: "absolute",
    right: -12,
    bottom: 14,
    minWidth: 82,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D9E3F8",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#13234A",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4
  },
  badge: {
    color: theme.colors.text,
    fontWeight: "900"
  },
  sparkle: {
    position: "absolute",
    top: 24,
    right: 28,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#FFFFFF"
  }
});

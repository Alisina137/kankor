import { theme } from "@kankor/config";
import { StyleSheet, Text } from "react-native";
import { Screen } from "../../components/screen";
import { SectionCard } from "../../components/section-card";
import { useLocale } from "../../providers/locale-provider";

export default function ExamsScreen() {
  const { direction, text } = useLocale();
  const title = text.exams;

  return (
    <Screen>
      <SectionCard title={title}>
        <Text style={[styles.body, { textAlign: direction === "rtl" ? "right" : "left" }]}>
          {text.comingLater}
        </Text>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 26
  }
});

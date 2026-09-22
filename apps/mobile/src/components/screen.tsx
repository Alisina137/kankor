import { theme } from "@kankor/config";
import type { PropsWithChildren } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { useLocale } from "../providers/locale-provider";

export function Screen({ children }: PropsWithChildren) {
  const { direction } = useLocale();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, { direction }]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md
  }
});

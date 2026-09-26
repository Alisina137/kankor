import { theme } from "@kankor/config";
import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocale } from "../providers/locale-provider";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, scroll = false, contentContainerStyle }: ScreenProps) {
  const { direction } = useLocale();

  return (
    <SafeAreaView style={[styles.safe, { direction }]}>
      {scroll ? (
        <ScrollView
          style={[styles.scroll, { direction }]}
          contentContainerStyle={[styles.scrollContent, { direction }, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, { direction }, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md
  }
});

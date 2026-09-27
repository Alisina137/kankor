import { theme } from "@kankor/config";
import { useSegments } from "expo-router";
import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountMenuButton } from "./account-menu-button";
import { useLocale } from "../providers/locale-provider";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, scroll = false, contentContainerStyle }: ScreenProps) {
  const { direction } = useLocale();
  const segments = useSegments();
  const showAccountMenu = segments.some((segment) => segment === "(tabs)");

  return (
    <SafeAreaView style={[styles.safe, { direction }]}>
      {showAccountMenu ? (
        <View style={styles.accountBar}>
          <AccountMenuButton />
        </View>
      ) : null}
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
  accountBar: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    direction: "ltr"
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

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LocaleProvider } from "../providers/locale-provider";

export default function RootLayout() {
  return (
    <LocaleProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </LocaleProvider>
  );
}

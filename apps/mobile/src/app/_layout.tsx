import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../providers/auth-provider";
import { LocaleProvider } from "../providers/locale-provider";

export default function RootLayout() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="exam/[attemptId]" />
          <Stack.Screen name="result/[attemptId]" />
          <Stack.Screen name="review/[attemptId]" />
        </Stack>
      </AuthProvider>
    </LocaleProvider>
  );
}

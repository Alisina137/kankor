import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { theme } from "@kankor/config";
import { useAuth } from "../providers/auth-provider";

export default function EntryScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} /></View>;
  }

  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (!user.onboardingCompleted) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

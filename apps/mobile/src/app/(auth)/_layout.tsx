import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../providers/auth-provider";

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Redirect href={user.onboardingCompleted ? "/(tabs)" : "/onboarding"} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

const icons = {
  index: "home-outline",
  practice: "book-outline",
  exams: "document-text-outline",
  progress: "stats-chart-outline",
  profile: "person-outline"
} as const;

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { text, direction } = useLocale();

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} /></View>;
  }
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (!user.onboardingCompleted) return <Redirect href="/onboarding" />;

  const items = [
    ["index", text.home],
    ["practice", text.practice],
    ["exams", text.exams],
    ["progress", text.progress],
    ["profile", text.profile]
  ] as const;

  const renderedItems = direction === "rtl" ? [...items].reverse() : items;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.mutedText,
      tabBarStyle: { height: 68, paddingTop: 7, paddingBottom: 8, borderTopColor: theme.colors.border }
    }}>
      {renderedItems.map(([name, title]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => <Ionicons name={icons[name]} color={color} size={size} />
          }}
        />
      ))}
    </Tabs>
  );
}

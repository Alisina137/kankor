import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { Tabs } from "expo-router";
import { useLocale } from "../../providers/locale-provider";

const icons = {
  index: "home-outline",
  practice: "book-outline",
  exams: "document-text-outline",
  progress: "stats-chart-outline",
  profile: "person-outline"
} as const;

export default function TabsLayout() {
  const { text } = useLocale();
  const items = [
    ["index", text.home],
    ["practice", text.practice],
    ["exams", text.exams],
    ["progress", text.progress],
    ["profile", text.profile]
  ] as const;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.mutedText,
      tabBarStyle: {
        height: 68,
        paddingTop: 7,
        paddingBottom: 8,
        borderTopColor: theme.colors.border
      }
    }}>
      {items.map(([name, title]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icons[name]} color={color} size={size} />
            )
          }}
        />
      ))}
    </Tabs>
  );
}

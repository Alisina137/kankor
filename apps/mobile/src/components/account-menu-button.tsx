import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "./app-text";
import { apiRequest } from "../lib/api";
import { useAuth } from "../providers/auth-provider";
import { useLocale } from "../providers/locale-provider";

const copy = {
  fa: {
    account: "حساب کاربری",
    profile: "پروفایل و تنظیمات",
    premium: "اشتراک و Premium",
    progress: "پیشرفت من",
    logout: "خروج از حساب"
  },
  ps: {
    account: "کارن حساب",
    profile: "پروفایل او تنظیمات",
    premium: "ګډون او Premium",
    progress: "زما پرمختګ",
    logout: "له حسابه وتل"
  },
  en: {
    account: "Account",
    profile: "Profile & settings",
    premium: "Subscription & Premium",
    progress: "My progress",
    logout: "Sign out"
  }
} as const;

export function AccountMenuButton() {
  const { user, token, logout } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  const initials = useMemo(() => {
    const local = user?.email?.split("@")[0] ?? "?";
    return local.slice(0, 2).toUpperCase();
  }, [user?.email]);

  const loadPhoto = useCallback(async () => {
    if (!token) {
      setPhotoUrl(null);
      return;
    }

    setPhotoLoading(true);
    try {
      const result = await apiRequest<{ configured: boolean; url: string | null }>(
        "/auth/profile-photo",
        {},
        token
      );
      setPhotoUrl(result.url);
    } catch {
      setPhotoUrl(null);
    } finally {
      setPhotoLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    void loadPhoto();
  }, [loadPhoto]));

  function openMenu() {
    setOpen(true);
    void loadPhoto();
  }

  function go(path: "/(tabs)/profile" | "/premium" | "/(tabs)/progress") {
    setOpen(false);
    router.push(path);
  }

  async function signOut() {
    setOpen(false);
    await logout();
    router.replace("/(auth)/login");
  }

  if (!user) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text.account}
        onPress={openMenu}
        style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <Text style={styles.avatarInitials}>{initials}</Text>
        )}
        {photoLoading ? (
          <View style={styles.avatarLoading}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />

          <View
            style={[
              styles.menu,
              {
                top: Math.max(insets.top + 48, 56),
                right: theme.spacing.md,
                direction
              }
            ]}
          >
            <View style={[styles.identity, { direction }]}>
              <View style={styles.menuAvatar}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.menuInitials}>{initials}</Text>
                )}
              </View>
              <View style={styles.identityCopy}>
                <Text
                  style={[
                    styles.accountLabel,
                    { textAlign: direction === "rtl" ? "right" : "left", writingDirection: direction }
                  ]}
                >
                  {text.account}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.email,
                    { textAlign: direction === "rtl" ? "right" : "left", writingDirection: direction }
                  ]}
                >
                  {user.email}
                </Text>
              </View>
            </View>

            <View style={styles.separator} />

            <MenuItem
              icon="person-outline"
              label={text.profile}
              direction={direction}
              onPress={() => go("/(tabs)/profile")}
            />
            <MenuItem
              icon="diamond-outline"
              label={text.premium}
              direction={direction}
              onPress={() => go("/premium")}
            />
            <MenuItem
              icon="stats-chart-outline"
              label={text.progress}
              direction={direction}
              onPress={() => go("/(tabs)/progress")}
            />

            <View style={styles.separator} />

            <MenuItem
              icon="log-out-outline"
              label={text.logout}
              direction={direction}
              danger
              onPress={() => void signOut()}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuItem({
  icon,
  label,
  direction,
  danger = false,
  onPress
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  direction: "rtl" | "ltr";
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, { direction }, pressed && styles.menuItemPressed]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={danger ? theme.colors.danger : theme.colors.text}
      />
      <Text
        style={[
          styles.menuItemText,
          danger && styles.dangerText,
          {
            textAlign: direction === "rtl" ? "right" : "left",
            writingDirection: direction
          }
        ]}
      >
        {label}
      </Text>
      <Ionicons
        name={direction === "rtl" ? "chevron-back" : "chevron-forward"}
        size={17}
        color={theme.colors.mutedText}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    width: 42,
    height: 42,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.primary
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  avatarLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)"
  },
  pressed: {
    opacity: 0.78
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.18)"
  },
  menu: {
    position: "absolute",
    width: 286,
    maxWidth: "86%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    elevation: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  menuAvatar: {
    width: 46,
    height: 46,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: theme.colors.primary
  },
  menuInitials: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  accountLabel: {
    color: theme.colors.text,
    fontWeight: "900"
  },
  email: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border
  },
  menuItem: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md
  },
  menuItemPressed: {
    backgroundColor: theme.colors.background
  },
  menuItemText: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: "700"
  },
  dangerText: {
    color: theme.colors.danger
  }
});

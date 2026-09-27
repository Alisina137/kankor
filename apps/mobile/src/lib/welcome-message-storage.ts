import AsyncStorage from "@react-native-async-storage/async-storage";

export type PendingWelcomeMessage = "back" | "new";

const WELCOME_MESSAGE_KEY = "kankor:pending-welcome:v1";

export async function setPendingWelcomeMessage(message: PendingWelcomeMessage) {
  await AsyncStorage.setItem(WELCOME_MESSAGE_KEY, message);
}

export async function consumePendingWelcomeMessage(): Promise<PendingWelcomeMessage | null> {
  const value = await AsyncStorage.getItem(WELCOME_MESSAGE_KEY);
  await AsyncStorage.removeItem(WELCOME_MESSAGE_KEY);

  return value === "back" || value === "new" ? value : null;
}

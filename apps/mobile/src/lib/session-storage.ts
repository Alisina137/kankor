import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "kankorprep.session";

function webStorage() {
  if (typeof globalThis.localStorage === "undefined") return null;
  return globalThis.localStorage;
}

export async function getStoredSession() {
  if (Platform.OS === "web") return webStorage()?.getItem(SESSION_KEY) ?? null;
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function setStoredSession(token: string) {
  if (Platform.OS === "web") {
    webStorage()?.setItem(SESSION_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function clearStoredSession() {
  if (Platform.OS === "web") {
    webStorage()?.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

import AsyncStorage from "@react-native-async-storage/async-storage";

const INTRO_SEEN_KEY = "kankor:intro-seen:v1";

export async function hasSeenIntro() {
  return (await AsyncStorage.getItem(INTRO_SEEN_KEY)) === "1";
}

export async function markIntroSeen() {
  await AsyncStorage.setItem(INTRO_SEEN_KEY, "1");
}

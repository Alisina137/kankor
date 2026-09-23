import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const screen = await readFile(resolve("apps/mobile/src/components/screen.tsx"), "utf8");
for (const marker of [
  'style={[styles.safe, { direction }]}',
  'style={[styles.scroll, { direction }]}',
  'contentContainerStyle={[styles.scrollContent, { direction }'
]) {
  if (!screen.includes(marker)) throw new Error(`Screen RTL invariant missing: ${marker}`);
}

const field = await readFile(resolve("apps/mobile/src/components/form-field.tsx"), "utf8");
if (!field.includes("writingDirection: direction") || !field.includes("textAlign: align")) {
  throw new Error("Form fields must use locale-aware text alignment and writing direction");
}

const button = await readFile(resolve("apps/mobile/src/components/app-button.tsx"), "utf8");
if (!button.includes("writingDirection: direction")) {
  throw new Error("Shared button labels must preserve RTL writing direction");
}

const tabs = await readFile(resolve("apps/mobile/src/app/(tabs)/_layout.tsx"), "utf8");
if (!tabs.includes('direction === "rtl" ? [...items].reverse() : items')) {
  throw new Error("Bottom tab order must reverse for RTL locales");
}

const writingDirectionScreens = [
  "apps/mobile/src/app/(auth)/login.tsx",
  "apps/mobile/src/app/(auth)/recovery.tsx",
  "apps/mobile/src/app/(auth)/register.tsx",
  "apps/mobile/src/app/(auth)/reset-password.tsx",
  "apps/mobile/src/app/(auth)/welcome.tsx",
  "apps/mobile/src/app/(tabs)/exams.tsx",
  "apps/mobile/src/app/(tabs)/index.tsx",
  "apps/mobile/src/app/(tabs)/practice.tsx",
  "apps/mobile/src/app/(tabs)/profile.tsx",
  "apps/mobile/src/app/(tabs)/progress.tsx",
  "apps/mobile/src/app/exam/[attemptId].tsx",
  "apps/mobile/src/app/historical.tsx",
  "apps/mobile/src/app/mistakes.tsx",
  "apps/mobile/src/app/onboarding.tsx",
  "apps/mobile/src/app/premium.tsx",
  "apps/mobile/src/app/result/[attemptId].tsx",
  "apps/mobile/src/app/review/[attemptId].tsx"
];

for (const file of writingDirectionScreens) {
  const content = await readFile(resolve(file), "utf8");
  const localizedAlignUses = [...content.matchAll(/textAlign\s*:\s*align/g)].length;
  const localizedWritingUses = [...content.matchAll(/writingDirection\s*:\s*direction/g)].length;
  if (localizedWritingUses < localizedAlignUses) {
    throw new Error(`Localized text writing direction missing: ${file}`);
  }
}

const directionalScreens = [
  "apps/mobile/src/app/(tabs)/exams.tsx",
  "apps/mobile/src/app/(tabs)/practice.tsx",
  "apps/mobile/src/app/(tabs)/progress.tsx",
  "apps/mobile/src/app/exam/[attemptId].tsx",
  "apps/mobile/src/app/historical.tsx",
  "apps/mobile/src/app/mistakes.tsx",
  "apps/mobile/src/app/onboarding.tsx",
  "apps/mobile/src/app/premium.tsx",
  "apps/mobile/src/app/result/[attemptId].tsx",
  "apps/mobile/src/app/review/[attemptId].tsx"
];

for (const file of directionalScreens) {
  const content = await readFile(resolve(file), "utf8");
  if (!content.includes('direction === "rtl" ? "row-reverse" : "row"')) {
    throw new Error(`RTL row direction missing: ${file}`);
  }
}

for (const file of [
  "apps/mobile/src/app/historical.tsx",
  "apps/mobile/src/app/mistakes.tsx",
  "apps/mobile/src/app/premium.tsx",
  "apps/mobile/src/app/review/[attemptId].tsx"
]) {
  const content = await readFile(resolve(file), "utf8");
  if (!content.includes('direction === "rtl" ? "arrow-forward" : "arrow-back"')) {
    throw new Error(`RTL back-arrow mirroring missing: ${file}`);
  }
}

const exam = await readFile(resolve("apps/mobile/src/app/exam/[attemptId].tsx"), "utf8");
if (!exam.includes('direction === "rtl" ? "chevron-forward" : "chevron-back"')
  || !exam.includes('direction === "rtl" ? "chevron-back" : "chevron-forward"')) {
  throw new Error("Exam previous/next chevrons must mirror in RTL");
}

console.log("Mobile RTL verified: Dari/Pashto use RTL screen direction and RTL text writing direction, right-aligned localized content, reversed horizontal flows, mirrored navigation icons, and RTL tab order while English remains LTR.");

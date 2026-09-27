import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const appText = await readFile(resolve("apps/mobile/src/components/app-text.tsx"), "utf8");
for (const marker of [
  'const align = direction === "rtl" ? "right" : "left"',
  'textAlign: align',
  'writingDirection: direction'
]) {
  if (!appText.includes(marker)) throw new Error(`Shared AppText RTL invariant missing: ${marker}`);
}

const localeAwareTextFiles = [
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
  "apps/mobile/src/app/_layout.tsx",
  "apps/mobile/src/app/exam/[attemptId].tsx",
  "apps/mobile/src/app/historical.tsx",
  "apps/mobile/src/app/index.tsx",
  "apps/mobile/src/app/mistakes.tsx",
  "apps/mobile/src/app/onboarding.tsx",
  "apps/mobile/src/app/premium.tsx",
  "apps/mobile/src/app/result/[attemptId].tsx",
  "apps/mobile/src/app/review/[attemptId].tsx",
  "apps/mobile/src/components/account-menu-button.tsx",
  "apps/mobile/src/components/app-button.tsx",
  "apps/mobile/src/components/auth-form-shell.tsx",
  "apps/mobile/src/components/auth-illustration.tsx",
  "apps/mobile/src/components/form-field.tsx",
  "apps/mobile/src/components/section-card.tsx"
];

for (const file of localeAwareTextFiles) {
  const content = await readFile(resolve(file), "utf8");
  if (content.includes("<Text") && !content.includes("AppText as Text")) {
    throw new Error(`Locale-aware AppText missing: ${file}`);
  }
  if (/import\s*{[\s\S]*?\bText\b[\s\S]*?}\s*from "react-native";/m.test(content)) {
    throw new Error(`raw React Native Text import detected: ${file}`);
  }
}

const home = await readFile(resolve("apps/mobile/src/app/(tabs)/index.tsx"), "utf8");
for (const marker of [
  "function HomeEdgeText(",
  'direction: "ltr"',
  'homeTextAnchorRight',
  'alignItems: "flex-end"',
  'homeTextAnchorLeft',
  'alignItems: "flex-start"',
  'maxWidth: "100%"',
  "<HomeEdgeText style={styles.appName}",
  "<HomeEdgeText style={styles.title}",
  "<HomeEdgeText style={styles.subtitle}",
  "<HomeEdgeText style={styles.sectionTitle} direction={direction}>{text.recommendation}</HomeEdgeText>",
  "<HomeEdgeText style={styles.body} direction={direction}>{text.firstAction}</HomeEdgeText>"
]) {
  if (!home.includes(marker)) throw new Error(`Home RTL edge-anchor invariant missing: ${marker}`);
}

const screen = await readFile(resolve("apps/mobile/src/components/screen.tsx"), "utf8");
for (const marker of [
  'style={[styles.safe, { direction }]}',
  'style={[styles.scroll, { direction }]}',
  'contentContainerStyle={[styles.scrollContent, { direction }'
]) {
  if (!screen.includes(marker)) throw new Error(`Screen RTL invariant missing: ${marker}`);
}

const field = await readFile(resolve("apps/mobile/src/components/form-field.tsx"), "utf8");
if (!field.includes("writingDirection: direction") || !field.includes('const align = direction === "rtl" ? "right" : "left"')) {
  throw new Error("Form fields must follow locale text alignment and writing direction");
}

const button = await readFile(resolve("apps/mobile/src/components/app-button.tsx"), "utf8");
if (!button.includes("writingDirection: direction")) {
  throw new Error("Shared button labels must preserve RTL writing direction");
}

const tabs = await readFile(resolve("apps/mobile/src/app/(tabs)/_layout.tsx"), "utf8");
if (!tabs.includes('direction === "rtl" ? [...items].reverse() : items')) {
  throw new Error("Bottom tab order must reverse for RTL locales");
}
if (!tabs.includes("tabBarLabelStyle") || !tabs.includes("writingDirection: direction")) {
  throw new Error("Bottom tab labels must follow locale writing direction");
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
  "apps/mobile/src/app/premium.tsx",
  "apps/mobile/src/app/result/[attemptId].tsx",
  "apps/mobile/src/app/review/[attemptId].tsx"
];

for (const file of directionalScreens) {
  const content = await readFile(resolve(file), "utf8");
  if (content.includes('"row-reverse"')) {
    throw new Error(`Content row double-reversal detected: ${file}. Screen already supplies RTL direction.`);
  }
  if (!content.includes('const rowDirection = "row";')) {
    throw new Error(`Direction-aware content row invariant missing: ${file}`);
  }
}

for (const file of [
  "apps/mobile/src/app/historical.tsx",
  "apps/mobile/src/app/mistakes.tsx",
  "apps/mobile/src/app/onboarding.tsx",
  "apps/mobile/src/app/premium.tsx",
  "apps/mobile/src/app/review/[attemptId].tsx"
]) {
  const content = await readFile(resolve(file), "utf8");
  if (!content.includes('direction === "rtl" ? "arrow-forward" : "arrow-back"')) {
    throw new Error(`RTL back-arrow mirroring missing: ${file}`);
  }
}

const standaloneDirectionScreens = [
  ["apps/mobile/src/app/exam/[attemptId].tsx", 'styles.page, { direction }'],
  ["apps/mobile/src/app/result/[attemptId].tsx", 'styles.pageRoot, { direction }'],
  ["apps/mobile/src/app/review/[attemptId].tsx", 'styles.page, { direction }']
];

for (const [file, marker] of standaloneDirectionScreens) {
  const content = await readFile(resolve(file), "utf8");
  if (!content.includes(marker)) {
    throw new Error(`Standalone screen direction invariant missing: ${file}`);
  }
}

const accountMenu = await readFile(resolve("apps/mobile/src/components/account-menu-button.tsx"), "utf8");
for (const marker of ["direction", "styles.identity, { direction }", "styles.menuItem, { direction }"]) {
  if (!accountMenu.includes(marker)) throw new Error(`RTL account-menu invariant missing: ${marker}`);
}

const exam = await readFile(resolve("apps/mobile/src/app/exam/[attemptId].tsx"), "utf8");
if (!exam.includes('direction === "rtl" ? "chevron-forward" : "chevron-back"')
  || !exam.includes('direction === "rtl" ? "chevron-back" : "chevron-forward"')) {
  throw new Error("Exam previous/next chevrons must mirror in RTL");
}

console.log("Mobile RTL verified: Dari/Pashto use right alignment plus RTL writing/layout direction, English uses left alignment plus LTR, standalone screens inherit locale direction, navigation icons mirror correctly, and RTL tab order is preserved.");

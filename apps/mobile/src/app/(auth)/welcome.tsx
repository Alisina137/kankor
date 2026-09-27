import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import { AppButton } from "../../components/app-button";
import { AppText as Text } from "../../components/app-text";
import { AuthIllustration } from "../../components/auth-illustration";
import { Screen } from "../../components/screen";
import { markIntroSeen } from "../../lib/first-run-storage";
import { useLocale } from "../../providers/locale-provider";

const copy = {
  fa: {
    eyebrow: "آمادگی هوشمند کانکور",
    next: "ادامه",
    getStarted: "شروع کنید",
    slides: [
      {
        title: "با یک مسیر روشن شروع کنید",
        body: "درس‌ها، کتاب‌ها و موضوعات را منظم پیدا کنید و هر روز با هدف مشخص پیش بروید.",
        variant: "learn" as const
      },
      {
        title: "تمرین کنید، نه فقط مطالعه",
        body: "آزمون‌های هدفمند و کانکور کامل کمک می‌کنند نقاط قوت و ضعف خود را دقیق‌تر بشناسید.",
        variant: "practice" as const
      },
      {
        title: "پیشرفت خود را ببینید",
        body: "نتایج، اشتباهات و موضوعات ضعیف شما به یک برنامه عملی برای قدم بعدی تبدیل می‌شوند.",
        variant: "progress" as const
      }
    ]
  },
  ps: {
    eyebrow: "هوښیار کانکور چمتووالی",
    next: "دوام",
    getStarted: "پیل کړئ",
    slides: [
      {
        title: "په روښانه مسیر پیل وکړئ",
        body: "درسونه، کتابونه او موضوعات په منظم ډول پیدا کړئ او هره ورځ له روښانه هدف سره مخکې لاړ شئ.",
        variant: "learn" as const
      },
      {
        title: "تمرین وکړئ، یوازې لوستل نه",
        body: "هدفمندې ازموینې او بشپړ کانکور ستاسو قوي او کمزوري ځایونه په روښانه ډول ښيي.",
        variant: "practice" as const
      },
      {
        title: "خپل پرمختګ ووینئ",
        body: "پایلې، تېروتنې او کمزورې موضوعګانې په راتلونکي عملي ګام بدلېږي.",
        variant: "progress" as const
      }
    ]
  },
  en: {
    eyebrow: "Smarter Kankor preparation",
    next: "Continue",
    getStarted: "Get started",
    slides: [
      {
        title: "Start with a clear path",
        body: "Find subjects, books, and topics in one structured place and study with a clear daily direction.",
        variant: "learn" as const
      },
      {
        title: "Practice, not just study",
        body: "Targeted practice and full Kankor exams help you understand exactly where you are strong and weak.",
        variant: "practice" as const
      },
      {
        title: "See your progress",
        body: "Results, mistakes, and weak topics turn into a practical next step for your preparation.",
        variant: "progress" as const
      }
    ]
  }
} as const;

export default function WelcomeScreen() {
  const { locale, direction, text } = useLocale();
  const local = copy[locale];
  const { width } = useWindowDimensions();
  const slideWidth = Math.max(280, width - theme.spacing.md * 2);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  async function next() {
    if (index < local.slides.length - 1) {
      scrollRef.current?.scrollTo({ x: slideWidth * (index + 1), animated: true });
      setIndex((current) => Math.min(current + 1, local.slides.length - 1));
      return;
    }

    await markIntroSeen();
    router.push("/(auth)/register");
  }

  async function signIn() {
    await markIntroSeen();
    router.push("/(auth)/login");
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setIndex(Math.max(0, Math.min(nextIndex, local.slides.length - 1)));
  }

  return (
    <Screen>
      <View style={styles.page}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons name="school-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>{text.appName}</Text>
        </View>

        <Text style={styles.eyebrow}>{local.eyebrow}</Text>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          style={styles.carousel}
        >
          {local.slides.map((slide) => (
            <View key={slide.title} style={[styles.slide, { width: slideWidth }]}>
              <AuthIllustration variant={slide.variant} />
              <View style={styles.copy}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.body}>{slide.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {local.slides.map((slide, dotIndex) => (
              <View
                key={slide.title}
                style={[styles.dot, dotIndex === index && styles.dotActive]}
              />
            ))}
          </View>

          <AppButton
            label={index === local.slides.length - 1 ? local.getStarted : local.next}
            onPress={next}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => void signIn()}
            style={styles.signIn}
          >
            <Text style={styles.signInMuted}>{text.haveAccount}</Text>
            <Text style={styles.signInStrong}> {text.signIn}</Text>
          </Pressable>

          <Text style={[styles.languageHint, { writingDirection: direction }]}>
            دری · پښتو · English
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingBottom: theme.spacing.lg
  },
  brandRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  logo: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    shadowColor: "#102A66",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  brand: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  eyebrow: {
    marginTop: theme.spacing.sm,
    color: theme.colors.primary,
    fontSize: theme.typography.small,
    fontWeight: "800"
  },
  carousel: {
    flex: 1,
    marginHorizontal: -theme.spacing.md
  },
  slide: {
    justifyContent: "center",
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md
  },
  copy: {
    gap: theme.spacing.sm
  },
  title: {
    color: theme.colors.text,
    fontSize: 31,
    lineHeight: 40,
    fontWeight: "900"
  },
  body: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 27
  },
  footer: {
    gap: theme.spacing.md
  },
  dots: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CFD7E6"
  },
  dotActive: {
    width: 26,
    backgroundColor: theme.colors.primary
  },
  signIn: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  signInMuted: {
    color: theme.colors.mutedText,
    fontWeight: "600",
    textAlign: "center"
  },
  signInStrong: {
    color: theme.colors.primary,
    fontWeight: "900",
    textAlign: "center"
  },
  languageHint: {
    color: theme.colors.mutedText,
    fontSize: 11,
    textAlign: "center"
  }
});

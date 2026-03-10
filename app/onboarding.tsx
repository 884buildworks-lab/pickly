import { StyleSheet, View, Pressable, Dimensions, ScrollView } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '🔗',
    title: 'URLを保存',
    body: 'WebページのURLをシェアするだけで、\nサムネイル付きカードとして自動保存されます。',
  },
  {
    icon: '📁',
    title: 'コレクションで整理',
    body: '旅行・プレゼント・買い物など、\nテーマ別にカードをまとめましょう。',
  },
  {
    icon: '✅',
    title: '比較して決定',
    body: '候補を並べて比較し、「決定」「却下」で\nスッキリ整理。あなたの選択を助けます。',
  },
] as const;

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);

  const [currentPage, setCurrentPage] = useState(0);

  const isLast = currentPage === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      setHasCompletedOnboarding(true);
      hapticSuccess();
      router.replace('/');
    } else {
      setCurrentPage((p) => p + 1);
      hapticLight();
    }
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
    hapticLight();
    router.replace('/');
  };

  const slide = SLIDES[currentPage];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Skip button */}
      {!isLast && (
        <Pressable
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}
          onPress={handleSkip}
        >
          <ThemedText style={[styles.skipText, { color: colors.tint }]}>スキップ</ThemedText>
        </Pressable>
      )}

      {/* Slide content */}
      <View style={styles.slideContent}>
        <ThemedText style={styles.slideIcon}>{slide.icon}</ThemedText>
        <ThemedText style={[styles.slideTitle, { color: colors.text }]}>{slide.title}</ThemedText>
        <ThemedText style={[styles.slideBody, { color: colors.textSecondary }]}>{slide.body}</ThemedText>
      </View>

      {/* Pagination dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === currentPage ? colors.tint : colors.border,
                width: i === currentPage ? 20 : 7,
              },
            ]}
          />
        ))}
      </View>

      {/* CTA button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: colors.tint },
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleNext}
        >
          <ThemedText style={styles.ctaButtonText}>
            {isLast ? 'はじめる' : '次へ'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },

  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  skipText: {
    ...Typography.body,
    fontWeight: '500',
  },

  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  slideIcon: {
    fontSize: 88,
    marginBottom: 32,
  },
  slideTitle: {
    ...Typography.title1,
    textAlign: 'center',
    marginBottom: 16,
  },
  slideBody: {
    ...Typography.body,
    lineHeight: 26,
    textAlign: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 40,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },

  footer: {
    width: '100%',
    paddingHorizontal: Spacing.screenHorizontal,
  },
  ctaButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: Typography.headline.fontSize,
    fontWeight: Typography.headline.fontWeight,
  },
});

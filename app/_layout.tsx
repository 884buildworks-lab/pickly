import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useShareIntent } from 'expo-share-intent';
import 'react-native-reanimated';

import { useAppStore } from '@/store';

export default function RootLayout() {
  const systemColorScheme = useSystemColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);
  const setSharedUrl = useAppStore((state) => state.setSharedUrl);

  // Apply theme based on user preference
  const colorScheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme ?? 'light';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  // ナビゲーションの準備完了を追跡
  const navRef = useNavigationContainerRef();
  const [isNavReady, setIsNavReady] = useState(false);

  useEffect(() => {
    // 既にreadyならすぐにセット
    if (navRef?.isReady()) {
      setIsNavReady(true);
      return;
    }
    // readyになるのを待つ（コールドスタート時はまだreadyではない）
    const interval = setInterval(() => {
      if (navRef?.isReady()) {
        setIsNavReady(true);
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [navRef]);

  // expo-share-intent で共有されたコンテンツを受信
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  // 共有インテントを処理する関数
  const processShareIntent = useCallback(() => {
    if (!shareIntent) return;

    const sharedText = shareIntent.text ?? shareIntent.webUrl ?? '';
    if (sharedText) {
      // テキストからURLを抽出
      const urlMatch = sharedText.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        setSharedUrl(urlMatch[0]);
      } else {
        setSharedUrl(sharedText);
      }
      router.push('/save-modal');
    }
    resetShareIntent();
  }, [shareIntent, setSharedUrl, resetShareIntent]);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;
    if (!isNavReady) return;

    // ナビゲーション準備完了後に遷移
    processShareIntent();
  }, [hasShareIntent, shareIntent, isNavReady, processShareIntent]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="collection/[id]" options={{ title: 'コレクション' }} />
        <Stack.Screen name="card/[id]" options={{ title: 'カード詳細' }} />
        <Stack.Screen
          name="save-modal"
          options={{ presentation: 'modal', title: '保存' }}
        />
        <Stack.Screen
          name="collection-modal"
          options={{ presentation: 'modal', title: 'コレクション' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

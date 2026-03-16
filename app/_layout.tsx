import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
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
    if (navRef?.current) {
      setIsNavReady(true);
    }
  }, [navRef?.current]);

  // expo-share-intent で共有されたコンテンツを受信
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent || !shareIntent || !isNavReady) return;

    // テキスト（URL）を受け取った場合
    const sharedText = shareIntent.text ?? shareIntent.webUrl ?? '';
    if (sharedText) {
      // テキストからURLを抽出
      const urlMatch = sharedText.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        setSharedUrl(urlMatch[0]);
      } else {
        // URLが見つからなければテキストをそのまま設定
        setSharedUrl(sharedText);
      }
      // ナビゲーション準備完了後に遷移
      setTimeout(() => router.push('/save-modal'), 100);
    }

    resetShareIntent();
  }, [hasShareIntent, shareIntent, setSharedUrl, resetShareIntent, isNavReady]);

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

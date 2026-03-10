import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Linking, useColorScheme as useSystemColorScheme } from 'react-native';
import * as ExpoLinking from 'expo-linking';
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

  // 共有されたURLを処理
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const url = event.url;
      // pickly:// スキームの場合は内部ナビゲーション
      if (url.startsWith('pickly://')) {
        return;
      }
      // http/https の場合は共有されたURL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        setSharedUrl(url);
        router.push('/save-modal');
      } else {
        // テキストから URL を抽出 (Android SEND intent)
        const urlMatch = url.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          setSharedUrl(urlMatch[0]);
          router.push('/save-modal');
        }
      }
    };

    // アプリ起動時のURLをチェック
    ExpoLinking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    // URLイベントをリスン
    const subscription = Linking.addEventListener('url', handleUrl);

    return () => {
      subscription.remove();
    };
  }, [setSharedUrl]);

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

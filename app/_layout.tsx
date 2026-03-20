import { CommonActions, DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, useColorScheme as useSystemColorScheme } from 'react-native';
import { ShareIntentModule, getShareExtensionKey } from 'expo-share-intent';
import 'react-native-reanimated';

import { useAppStore } from '@/store';

export default function RootLayout() {
  const systemColorScheme = useSystemColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);

  const colorScheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme ?? 'light';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  // ナビゲーションの準備完了を追跡
  const navRef = useNavigationContainerRef();
  const [isNavReady, setIsNavReady] = useState(false);
  // 重複ナビゲーション防止: タイムスタンプベースのデバウンス
  const lastNavigatedAt = useRef(0);
  const NAVIGATE_DEBOUNCE_MS = 1500;

  useEffect(() => {
    if (navRef?.isReady()) {
      setIsNavReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (navRef?.isReady()) {
        setIsNavReady(true);
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [navRef]);

  // コールドスタート用: 通常の router.push
  const navigateToSaveModal = () => {
    const now = Date.now();
    if (now - lastNavigatedAt.current < NAVIGATE_DEBOUNCE_MS) return;
    try {
      const state = navRef.getState();
      const currentRoute = state?.routes[state.routes.length - 1];
      if (currentRoute?.name === 'save-modal') return;
    } catch { /* ignore */ }
    lastNavigatedAt.current = now;
    router.push('/save-modal');
  };

  // ウォームスタート用: ナビゲーション状態を強制リセットしてから save-modal を開く
  // (インテント受信でexpo-routerの状態が壊れるケースへの対応)
  const forceNavigateToSaveModal = () => {
    const now = Date.now();
    if (now - lastNavigatedAt.current < NAVIGATE_DEBOUNCE_MS) return;

    // save-modal が既に表示中の場合はナビゲーションをスキップ
    // → 新しいインテントデータは useShareIntentSafe の onChange 経由で自動反映される
    try {
      const state = navRef.getState();
      const currentRoute = state?.routes[state.routes.length - 1];
      if (currentRoute?.name === 'save-modal') return;
    } catch { /* ignore */ }

    lastNavigatedAt.current = now;
    navRef.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: '(tabs)' },
          { name: 'save-modal' },
        ],
      })
    );
  };

  // コールドスタート時: ナビゲーション準備完了後に共有インテントをチェック
  useEffect(() => {
    if (!isNavReady || !ShareIntentModule) return;

    const key = getShareExtensionKey();
    const hasPending = ShareIntentModule.hasShareIntent(key);

    if (hasPending) {
      let attempts = 0;
      const tryNavigate = () => {
        if (Date.now() - lastNavigatedAt.current < NAVIGATE_DEBOUNCE_MS) return;
        attempts++;
        try {
          const state = navRef.getState();
          const routeNames = state?.routeNames ?? [];
          if (routeNames.includes('save-modal') || attempts > 10) {
            navigateToSaveModal();
          } else {
            setTimeout(tryNavigate, 50);
          }
        } catch {
          if (attempts <= 10) setTimeout(tryNavigate, 50);
        }
      };
      setTimeout(tryNavigate, 100);
    }
  }, [isNavReady]);

  // ウォームスタート時: ネイティブモジュールの onStateChange で共有インテントを検知
  useEffect(() => {
    if (!ShareIntentModule) return;

    const subscription = ShareIntentModule.addListener('onStateChange', (event) => {
      if (event.value === 'pending' && isNavReady) {
        // インテント受信後、expo-routerの処理が落ち着くのを待ってから強制遷移
        setTimeout(() => forceNavigateToSaveModal(), 500);
      }
    });

    return () => subscription.remove();
  }, [isNavReady]);

  // ウォームスタート時フォールバック: AppStateでフォアグラウンド復帰時にpendingインテントをチェック
  // (Googleアプリなど、onStateChangeが発火しないケースへの対応)
  useEffect(() => {
    if (!ShareIntentModule) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isNavReady) {
        let retries = 0;
        const checkPending = () => {
          const key = getShareExtensionKey();
          if (ShareIntentModule.hasShareIntent(key)) {
            forceNavigateToSaveModal();
          } else if (retries < 2) {
            retries++;
            setTimeout(checkPending, 300);
          }
        };
        // expo-routerのインテント処理が落ち着いてからチェック
        setTimeout(checkPending, 500);
      }
    });

    return () => subscription.remove();
  }, [isNavReady]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
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

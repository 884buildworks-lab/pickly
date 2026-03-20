/**
 * expo-share-intent の useShareIntent フックは内部で useLinkingURL() を使用しており、
 * expo-router のリンキングと競合する。
 * このカスタムフックはネイティブモジュールを直接使い、競合を回避する。
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  ShareIntentModule,
  getShareExtensionKey,
  parseShareIntent,
} from 'expo-share-intent';
import type { ShareIntent } from 'expo-share-intent';

const DEFAULTVALUE: ShareIntent = {
  files: null,
  text: null,
  webUrl: null,
  type: null,
};

const isValueAvailable = (si: ShareIntent) =>
  !!(si?.text || si?.webUrl || si?.files);

export function useShareIntentSafe(options: { debug?: boolean; resetOnBackground?: boolean } = {}) {
  const { debug = false, resetOnBackground = true } = options;
  const appState = useRef(AppState.currentState);
  const [shareIntent, setShareIntent] = useState<ShareIntent>(DEFAULTVALUE);
  const [error, setError] = useState<string | null>(null);

  const key = getShareExtensionKey();

  const resetShareIntent = useCallback(() => {
    ShareIntentModule?.clearShareIntent(key);
    setShareIntent(DEFAULTVALUE);
    setError(null);
  }, [key]);

  const refreshShareIntent = useCallback(() => {
    debug && console.debug('[ShareIntentSafe] refresh');
    ShareIntentModule?.getShareIntent('');
  }, [debug]);

  // Mount: check for pending share intent
  useEffect(() => {
    if (!ShareIntentModule) return;
    debug && console.debug('[ShareIntentSafe] mount');
    refreshShareIntent();
  }, []);

  // Listen for share intent data from native module
  useEffect(() => {
    if (!ShareIntentModule) return;

    const changeSub = ShareIntentModule.addListener('onChange', (event) => {
      debug && console.debug('[ShareIntentSafe] onChange', JSON.stringify(event, null, 2));
      try {
        setShareIntent(parseShareIntent(event.value, { debug }));
      } catch (e) {
        debug && console.error('[ShareIntentSafe] parse error', e);
        setError('Cannot parse share intent');
      }
    });

    const errorSub = ShareIntentModule.addListener('onError', (event) => {
      debug && console.debug('[ShareIntentSafe] onError', event?.value);
      setError(event?.value ?? 'Unknown error');
    });

    return () => {
      changeSub.remove();
      errorSub.remove();
    };
  }, [debug]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        debug && console.debug('[ShareIntentSafe] app active, refreshing');
        refreshShareIntent();
      } else if (
        resetOnBackground &&
        appState.current === 'active' &&
        ['inactive', 'background'].includes(nextAppState)
      ) {
        debug && console.debug('[ShareIntentSafe] app to background, resetting');
        resetShareIntent();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshShareIntent, resetShareIntent, resetOnBackground, debug]);

  return {
    hasShareIntent: isValueAvailable(shareIntent),
    shareIntent,
    resetShareIntent,
    error,
  };
}

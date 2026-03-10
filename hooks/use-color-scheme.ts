import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useAppStore } from '@/store';

export function useColorScheme(): 'light' | 'dark' {
  const systemColorScheme = useSystemColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);

  if (themeMode === 'system') {
    return systemColorScheme ?? 'light';
  }
  return themeMode;
}

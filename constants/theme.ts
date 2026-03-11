/**
 * iOS-aligned design tokens for Pickly.
 *
 * Color values mirror Apple's Human Interface Guidelines:
 * https://developer.apple.com/design/human-interface-guidelines/color
 */

import { Platform } from 'react-native';

// iOS Blue – primary interactive color
const IOS_BLUE = '#007AFF';

export const Colors = {
  light: {
    /** Primary text – `label` */
    text: '#000000',
    /** Secondary text – `secondaryLabel` */
    textSecondary: '#8E8E93',
    /** Screen / view background */
    background: '#FFFFFF',
    /** Grouped table / section background – `systemGroupedBackground` */
    groupBackground: '#F2F2F7',
    /** Card / cell surface – `secondarySystemGroupedBackground` */
    card: '#FFFFFF',
    /** iOS Blue for interactive controls */
    tint: IOS_BLUE,
    /** Subtle border */
    border: '#E5E5EA',
    /** Inset separator with left indent – `separator` */
    separator: 'rgba(60,60,67,0.12)',
    /** Inactive tab icon */
    tabIconDefault: '#8E8E93',
    /** Active tab icon */
    tabIconSelected: IOS_BLUE,
    // Legacy alias used by existing icon components
    icon: '#8E8E93',
    /** Destructive action – iOS systemRed */
    destructive: '#FF3B30',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    background: '#000000',
    groupBackground: '#1C1C1E',
    card: '#2C2C2E',
    tint: IOS_BLUE,
    border: '#3A3A3C',
    separator: 'rgba(84,84,88,0.36)',
    tabIconDefault: '#8E8E93',
    tabIconSelected: IOS_BLUE,
    icon: '#8E8E93',
    destructive: '#FF453A',
  },
};

/** iOS typography scale matching Apple HIG */
export const Typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, lineHeight: 41 },
  title1:     { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  title2:     { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  headline:   { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  body:       { fontSize: 17, fontWeight: '400' as const, lineHeight: 22 },
  subhead:    { fontSize: 15, fontWeight: '400' as const, lineHeight: 20 },
  footnote:   { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption:    { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
};

/** Shared spacing constants */
export const Spacing = {
  screenHorizontal: 16,
  cellVertical: 12,
  cardRadius: 12,
  groupRadius: 10,
  buttonRadiusSm: 10,
  buttonRadiusMd: 12,
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

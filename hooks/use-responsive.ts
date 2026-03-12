import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints:
 * - compact:  < 600px  (phones)
 * - medium:   600–839px (small tablets, large phones landscape)
 * - expanded: >= 840px  (tablets 10"+)
 */
type Breakpoint = 'compact' | 'medium' | 'expanded';

export interface ResponsiveValues {
  /** Current screen width */
  width: number;
  /** Current screen height */
  height: number;
  /** Current breakpoint */
  breakpoint: Breakpoint;
  /** Whether the device is tablet-sized (medium or expanded) */
  isTablet: boolean;
  /** Scale factor for spacing (1.0 on phone, up to 1.5 on large tablet) */
  spacingScale: number;
  /** Horizontal screen padding */
  screenHorizontal: number;
  /** Grid columns for card views */
  gridColumns: number;
  /** Grid columns for 2-col layout */
  grid2Columns: number;
  /** Max content width for readability on large screens (0 = no limit) */
  maxContentWidth: number;
  /** Gap between grid items */
  gridGap: number;
  /** Thumbnail size for list view */
  listThumbSize: number;
  /** Favicon icon size */
  faviconSize: number;
  /** Favicon icon size (small) */
  faviconSizeSmall: number;
  /** Drawer width ratio */
  drawerWidthRatio: number;
  /** Emoji grid button size */
  emojiButtonSize: number;
}

export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width >= 840 ? 'expanded' :
    width >= 600 ? 'medium' :
    'compact';

  const isTablet = breakpoint !== 'compact';

  // Spacing scales up gently for larger screens
  const spacingScale =
    breakpoint === 'expanded' ? 1.4 :
    breakpoint === 'medium' ? 1.2 :
    1.0;

  const screenHorizontal = Math.round(16 * spacingScale);

  const gridColumns =
    breakpoint === 'expanded' ? 2 :
    breakpoint === 'medium' ? 2 :
    1;

  const grid2Columns =
    breakpoint === 'expanded' ? 4 :
    breakpoint === 'medium' ? 3 :
    2;

  // Cap content width for readability on wide screens
  const maxContentWidth = breakpoint === 'expanded' ? 960 : 0;

  const gridGap = Math.round(8 * spacingScale);

  const listThumbSize =
    breakpoint === 'expanded' ? 96 :
    breakpoint === 'medium' ? 84 :
    72;

  const faviconSize =
    breakpoint === 'expanded' ? 64 :
    breakpoint === 'medium' ? 56 :
    48;

  const faviconSizeSmall =
    breakpoint === 'expanded' ? 44 :
    breakpoint === 'medium' ? 38 :
    32;

  // On tablets, drawer should be narrower proportionally
  const drawerWidthRatio =
    breakpoint === 'expanded' ? 0.4 :
    breakpoint === 'medium' ? 0.5 :
    0.75;

  const emojiButtonSize =
    breakpoint === 'expanded' ? 56 :
    breakpoint === 'medium' ? 52 :
    46;

  return {
    width,
    height,
    breakpoint,
    isTablet,
    spacingScale,
    screenHorizontal,
    gridColumns,
    grid2Columns,
    maxContentWidth,
    gridGap,
    listThumbSize,
    faviconSize,
    faviconSizeSmall,
    drawerWidthRatio,
    emojiButtonSize,
  };
}

/**
 * Helper to scale a pixel value by the responsive scale factor.
 */
export function scale(base: number, factor: number): number {
  return Math.round(base * factor);
}

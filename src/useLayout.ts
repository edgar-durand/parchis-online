import { Platform, useWindowDimensions } from 'react-native';

export const DESKTOP_MIN = 1024;

export interface LayoutInfo {
  isDesktop: boolean;
  width: number;
  height: number;
  contentMax: number;
}

const DESKTOP_CONTENT_MAX = 1200;
const MOBILE_CONTENT_MAX = 560;

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_MIN;
  const contentMax = isDesktop
    ? Math.min(DESKTOP_CONTENT_MAX, Math.max(DESKTOP_MIN - 48, width - 48))
    : MOBILE_CONTENT_MAX;
  return { isDesktop, width, height, contentMax };
}

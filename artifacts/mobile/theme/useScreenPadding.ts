import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout, spacing } from "./spacing";

const WEB_PREVIEWER_TOP = 67;
const WEB_PREVIEWER_BOTTOM = 34;

export function useScreenPadding(opts?: {
  hasTabBar?: boolean;
  topExtra?: number;
  bottomExtra?: number;
}) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const top =
    insets.top +
    (isWeb ? WEB_PREVIEWER_TOP : 0) +
    layout.screenTop +
    (opts?.topExtra ?? 0);

  const bottomBase =
    insets.bottom + (isWeb ? WEB_PREVIEWER_BOTTOM : 0);

  const bottom =
    bottomBase +
    (opts?.hasTabBar ? layout.tabBarClearance : layout.screenBottom) +
    (opts?.bottomExtra ?? 0);

  return {
    top,
    bottom,
    horizontal: layout.screenHorizontal,
    insets,
    isWeb,
  };
}

export { spacing, layout };

import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from "react-native";
import { PaperBackground, PAINT } from "@/components/paint";
import { useScreenPadding } from "@/theme";

type Props = {
  children: React.ReactNode;
  hasTabBar?: boolean;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle | ViewStyle[];
  scrollProps?: Partial<ScrollViewProps>;
  topExtra?: number;
  bottomExtra?: number;
  background?: boolean;
};

export function ScreenContainer({
  children,
  hasTabBar = true,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  scrollProps,
  topExtra,
  bottomExtra,
  background = true,
}: Props) {
  const { top, bottom, horizontal } = useScreenPadding({
    hasTabBar,
    topExtra,
    bottomExtra,
  });

  const padding: ViewStyle = {
    paddingTop: top,
    paddingBottom: bottom,
    paddingHorizontal: horizontal,
  };

  if (!scroll) {
    return (
      <View style={styles.root}>
        {background ? <PaperBackground /> : null}
        <View style={[padding, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {background ? <PaperBackground /> : null}
      <ScrollView
        contentContainerStyle={[padding, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={PAINT.grassDeep}
            />
          ) : undefined
        }
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAINT.paper },
});

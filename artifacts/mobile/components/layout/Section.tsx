import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { CrayonUnderline, HAND_FONT, LABEL_FONT, PAINT } from "@/components/paint";
import { layout, spacing } from "@/theme";

type Props = {
  title?: string;
  subtitle?: string;
  underlineColor?: string;
  underlineWidth?: number;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  gap?: number;
};

export function Section({
  title,
  subtitle,
  underlineColor = PAINT.sun,
  underlineWidth = 140,
  children,
  style,
  gap = layout.subtitleToContent,
}: Props) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          <CrayonUnderline width={underlineWidth} color={underlineColor} />
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      <View style={{ marginTop: title ? gap : 0 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: layout.sectionGap },
  head: { gap: layout.titleToSubtitle },
  title: {
    fontFamily: HAND_FONT,
    fontSize: 28,
    color: PAINT.ink,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    marginTop: spacing.xs,
  },
});

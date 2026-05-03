import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  CrayonUnderline,
  HAND_FONT,
  LABEL_FONT,
  Mushroom,
  PaperBackground,
  PAINT,
} from "@/components/paint";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <PaperBackground />
        <View style={styles.center}>
          <Mushroom size={120} />
          <Text style={styles.title}>oh dear...</Text>
          <CrayonUnderline width={140} color={PAINT.red} seed={3} />
          <Text style={styles.subtitle}>
            this little corner of the web doesn&apos;t exist (yet).
          </Text>
          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>← go back home</Text>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAINT.paper },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 6,
  },
  title: {
    fontFamily: HAND_FONT,
    fontSize: 36,
    color: PAINT.ink,
    transform: [{ rotate: "-2deg" }],
    marginTop: 16,
  },
  subtitle: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.inkSoft,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
  link: { marginTop: 24 },
  linkText: {
    fontFamily: HAND_FONT,
    fontSize: 22,
    color: PAINT.blue,
  },
});

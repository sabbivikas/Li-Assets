import { useAuth } from "@clerk/expo";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { SupportFAB } from "@/components/SupportFAB";

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#1a1a1a",
          tabBarInactiveTintColor: "#888888",
          tabBarLabelStyle: { fontFamily: "PatrickHand_400Regular", fontSize: 12 },
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : "#fdf6e3",
            borderTopWidth: 2,
            borderTopColor: "#1a1a1a",
            elevation: 0,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={80}
                tint="light"
                style={[StyleSheet.absoluteFill, { backgroundColor: "#fdf6e3dd" }]}
              />
            ) : (
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: "#fdf6e3" }]}
              />
            ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="globe.americas" tintColor={color} size={24} />
              ) : (
                <Feather name="globe" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="species"
          options={{
            title: "Species",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="leaf" tintColor={color} size={24} />
              ) : (
                <Feather name="feather" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="signals"
          options={{
            title: "Signals",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="waveform" tintColor={color} size={24} />
              ) : (
                <Feather name="activity" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="cards"
          options={{
            title: "Cards",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="rectangle.stack" tintColor={color} size={24} />
              ) : (
                <Feather name="layers" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Reports",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="doc.text" tintColor={color} size={24} />
              ) : (
                <Feather name="file-text" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="person.crop.circle" tintColor={color} size={24} />
              ) : (
                <Feather name="user" size={22} color={color} />
              ),
          }}
        />
      </Tabs>
      <SupportFAB />
    </View>
  );
}

export default function TabLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

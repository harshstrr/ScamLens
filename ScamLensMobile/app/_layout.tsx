import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import "../global.css";
import { useEffect } from "react";
import { View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, API calls, etc.
      } catch (e) {
        console.warn(e);
      } finally {
        // Hide the splash screen completely
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  return (
    <View className={colorScheme === "dark" ? "dark flex-1" : "flex-1"}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack id="root" screenOptions={{ headerShown: false }} />
    </View>
  );
}

import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import "../global.css";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
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

  return <Stack id="root" screenOptions={{ headerShown: false }} />;
}

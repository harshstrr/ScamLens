import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import OnboardingScreen from "@/features/Onboarding";
import { restoreSecureCredentials } from "@/services/auth-service";
import { useAuthStore } from "@/utils/sessionStorage";

export default function Index() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    let isActive = true;

    const checkAuth = async () => {
      try {
        // Read the latest credentials directly from Android secure storage.
        await restoreSecureCredentials();

        if (!isActive) return;

        const restoredToken = useAuthStore.getState().token;
        console.log(restoredToken);
        if (restoredToken) {
          router.replace("/tabs/home");
          return;
        }
      } catch (error) {
        console.warn("Could not restore authentication:", error);
      } finally {
        if (isActive) {
          setIsCheckingAuth(false);
        }
      }
    };

    void checkAuth();

    return () => {
      isActive = false;
    };
  }, []);

  if (isCheckingAuth) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#111113]">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (token) {
    return null;
  }

  return <OnboardingScreen />;
}

import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { restoreSecureCredentials } from "@/services/auth-service";
import { appStorage } from "@/utils/app-storage";
import { useAuthStore } from "@/utils/sessionStorage";

export default function Index() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    let isActive = true;

    const checkAuth = async () => {
      try {
        await restoreSecureCredentials();

        if (!isActive) return;

        const restoredToken = useAuthStore.getState().token;

        const guest_mode = await appStorage.getItem("guest-mode");
        console.log("Guest Mode:", guest_mode);
        console.log("Restored Token:", restoredToken);
        if (restoredToken || guest_mode === "true") {
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

    try {
      void checkAuth();
    } catch (err) {
      console.log(err);
      router.replace("/onboarding");
    }

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
}

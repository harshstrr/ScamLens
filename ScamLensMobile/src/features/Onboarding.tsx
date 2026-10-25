import { signInWithGoogle } from "@/services/api-service";
import { saveAuthResponse } from "@/services/auth-service";
import { startGuestSession } from "@/services/scan-history-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import {
  Info,
  LockKeyhole,
  Shield,
  ShieldCheck,
  User2,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GoogleIcon from "../../assets/Google.svg";

const onboardingData = [
  {
    title: "Check suspicious\nmessages and links.",
    description:
      "From unexpected payment requests to job offers, get a clearer view before you respond.",
    note: "Paste a message, inspect a link or choose a screenshot.",
    icon: "shield",
  },
  {
    title: "Understand the\nwarning signs.",
    description:
      "See the exact words that raised a concern, with evidence-based explanations in simple English.",
    note: "Risk assessments, not guarantees of fraud or safety.",
    icon: "shield",
  },
  {
    title: "Your data. Your\ncontrol.",
    description:
      "Choose what you share, what you save and when your local history is deleted.",
    note: "No silent screen reading. Screen capture always needs your consent.",
    icon: "shield-check",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { height } = useWindowDimensions();
  const isDark = useColorScheme() === "dark";

  const current = onboardingData[currentIndex];
  const isLastScreen = currentIndex === onboardingData.length - 1;

  const handleContinue = () => {
    if (isLastScreen) {
      // Replace this with your navigation to the main app.
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex((index) => index + 1);
  };

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "704781607192-hjpi53ujt8q1k2oppu7hcqcaaftu7ri3.apps.googleusercontent.com",
    });
  }, []);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;

    try {
      setIsSigningIn(true);
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();
      if (response.type !== "success") return;

      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error("Google sign-in did not return an identity token.");
      }

      const authResponse = await signInWithGoogle(idToken);
      await saveAuthResponse(authResponse);
      router.replace("/tabs/home");
    } catch (error: unknown) {
      Alert.alert(
        "Sign-in failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleContinueAsGuest = async () => {
    try {
      await startGuestSession();
      router.replace("/tabs/home");
    } catch (error: unknown) {
      Alert.alert(
        "Could not continue",
        error instanceof Error
          ? error.message
          : "Guest mode could not be saved on this device.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#111113]">
      <View
        className="flex-1 px-6 "
        style={
          {
            // paddingBottom: insets.bottom
          }
        }
      >
        {/* Header */}
        <View className="flex-row items-center my-6">
          <View className="flex-row items-center gap-2">
            <Shield
              size={28}
              color={isDark ? "#F5F5F7" : "#202020"}
              strokeWidth={1.6}
            />
            <Text className="text-2xl font-bold tracking-widest text-[#202020] dark:text-[#F5F5F7]">
              ScamLens
            </Text>
          </View>
        </View>

        {/* Welcome label and Skip */}
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-sm font-semibold tracking-wider text-[#666666] dark:text-[#A1A1AA]">
            WELCOME TO SCAMLENS
          </Text>
        </View>

        {/* Main content */}
        <View className="flex-1">
          {/* Shield illustration */}
          <View
            className="items-center"
            style={{ marginTop: Math.max(48, height * 0.1) }}
          >
            <View className="h-[80px] w-[80px] items-center justify-center rounded-[20px] border border-[#EAEAEA] bg-[#FAFAFA] shadow-sm dark:border-[#3A3A3C] dark:bg-[#1C1C1E]">
              {current.icon === "shield-check" ? (
                <ShieldCheck
                  size={36}
                  color={isDark ? "#F5F5F7" : "#202020"}
                  strokeWidth={1.2}
                />
              ) : (
                <Shield
                  size={36}
                  color={isDark ? "#F5F5F7" : "#202020"}
                  strokeWidth={1.2}
                />
              )}
            </View>
          </View>

          {/* Title and description */}
          <View className="mt-12">
            <Text className="text-3xl font-extrabold leading-[38px] tracking-[-0.5px] text-[#202020] dark:text-[#F5F5F7]">
              {current.title}
            </Text>

            <Text className="mt-4 text-base leading-[24px] text-[#555555] dark:text-[#D4D4D8]">
              {current.description}
            </Text>

            {/* Supporting note */}
            <View className="mt-5 flex-row items-start gap-2 bg-[#FAFAFA] p-3 rounded-lg border border-[#F0F0F0] dark:bg-[#1C1C1E] dark:border-[#3A3A3C]">
              {currentIndex === 2 ? (
                <LockKeyhole
                  size={16}
                  color={isDark ? "#A1A1AA" : "#666666"}
                  strokeWidth={1.5}
                  style={{ marginTop: 2 }}
                />
              ) : (
                <Info
                  size={16}
                  color={isDark ? "#A1A1AA" : "#666666"}
                  strokeWidth={1.5}
                  style={{ marginTop: 2 }}
                />
              )}

              <Text className="flex-1 text-xs leading-[18px] text-[#666666] dark:text-[#A1A1AA]">
                {current.note}
              </Text>
            </View>
          </View>

          {/* Bottom controls */}
          <View className="mt-auto">
            {/* Pagination indicators */}
            <View className="mb-6 flex-row items-center justify-center gap-2">
              {onboardingData.map((_, index) => (
                <View
                  key={index}
                  className={`h-[4px] rounded-full transition-all ${
                    currentIndex === index
                      ? "w-[24px] bg-[#202020] dark:bg-[#F5F5F7]"
                      : "w-[8px] bg-[#E5E5E5] dark:bg-[#3A3A3C]"
                  }`}
                />
              ))}
            </View>

            {!isLastScreen ? (
              <Pressable
                onPress={handleContinue}
                accessibilityRole="button"
                accessibilityLabel={isLastScreen ? "Get started" : "Continue"}
                className="h-[52px] items-center justify-center rounded-[12px] bg-[#181818] active:bg-[#333333] elevation-1 dark:bg-[#F5F5F7] dark:active:bg-[#D4D4D8]"
              >
                <Text className="text-base font-bold text-white dark:text-[#111113]">
                  {isLastScreen ? "Get Started" : "Continue"}
                </Text>
              </Pressable>
            ) : (
              <View className="">
                <Pressable
                  onPress={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="h-[52px] flex-row gap-4 items-center justify-center rounded-[12px] bg-[#fff] active:bg-[#fff] border border-[#181818] elevation-1 dark:bg-[#1C1C1E] dark:active:bg-[#1C1C1E] dark:border-[#52525B]"
                >
                  <GoogleIcon width={20} height={20} />

                  <Text className="text-base font-semibold text-[#181818] dark:text-[#F5F5F7]">
                    Sign in with Google
                  </Text>
                </Pressable>

                <View className="flex-row items-center my-6">
                  <View className="flex-1 h-[1px] bg-[#EAEAEA] dark:bg-[#3A3A3C]" />

                  <Text className="mx-4 text-sm font-medium tracking-wide text-[#858585] uppercase dark:text-[#A1A1AA]">
                    or
                  </Text>
                  <View className="flex-1 h-[1px] bg-[#EAEAEA] dark:bg-[#3A3A3C]" />
                </View>

                <Pressable
                  onPress={handleContinueAsGuest}
                  className="h-[52px] flex-row gap-4 items-center justify-center rounded-[12px] bg-[#181818] active:bg-[#333333] elevation-1 dark:bg-[#F5F5F7] dark:active:bg-[#D4D4D8]"
                >
                  <User2 color={isDark ? "#111113" : "#fff"} size={21} />
                  <Text className="text-base font-semibold text-white dark:text-[#111113]">
                    Continue as Guest
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Step indicator */}
            <Text className="mt-5 mb-2 text-center text-xs text-[#858585] dark:text-[#A1A1AA]">
              Understand before you trust.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Shield,
  ShieldCheck,
  Info,
  LockKeyhole,
  User2,
} from "lucide-react-native";
import { router } from "expo-router";
import GoogleIcon from "../../assets/Google.svg";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

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
  const insets = useSafeAreaInsets();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const { height } = useWindowDimensions();

  const current = onboardingData[currentIndex];
  const isLastScreen = currentIndex === onboardingData.length - 1;

  const handleContinue = () => {
    if (isLastScreen) {
      // Replace this with your navigation to the main app.
      console.log("Onboarding completed");
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex((index) => index + 1);
  };

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "704781607192-hjpi53ujt8q1k2oppu7hcqcaaftu7ri3.apps.googleusercontent.com",
      
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

      console.log("Google SignIn Response:", response);
      // Navigate to your main application screen
      router.replace("/tabs/home");
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
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
            <Shield size={28} color="#202020" strokeWidth={1.6} />
            <Text className="text-2xl font-bold tracking-widest text-[#202020]">
              ScamLens
            </Text>
          </View>
        </View>

        {/* Welcome label and Skip */}
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-sm font-semibold tracking-wider text-[#666666]">
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
            <View className="h-[80px] w-[80px] items-center justify-center rounded-[20px] border border-[#EAEAEA] bg-[#FAFAFA] shadow-sm">
              {current.icon === "shield-check" ? (
                <ShieldCheck size={36} color="#202020" strokeWidth={1.2} />
              ) : (
                <Shield size={36} color="#202020" strokeWidth={1.2} />
              )}
            </View>
          </View>

          {/* Title and description */}
          <View className="mt-12">
            <Text className="text-3xl font-extrabold leading-[38px] tracking-[-0.5px] text-[#202020]">
              {current.title}
            </Text>

            <Text className="mt-4 text-base leading-[24px] text-[#555555]">
              {current.description}
            </Text>

            {/* Supporting note */}
            <View className="mt-5 flex-row items-start gap-2 bg-[#FAFAFA] p-3 rounded-lg border border-[#F0F0F0]">
              {currentIndex === 2 ? (
                <LockKeyhole
                  size={16}
                  color="#666666"
                  strokeWidth={1.5}
                  style={{ marginTop: 2 }}
                />
              ) : (
                <Info
                  size={16}
                  color="#666666"
                  strokeWidth={1.5}
                  style={{ marginTop: 2 }}
                />
              )}

              <Text className="flex-1 text-xs leading-[18px] text-[#666666]">
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
                      ? "w-[24px] bg-[#202020]"
                      : "w-[8px] bg-[#E5E5E5]"
                  }`}
                />
              ))}
            </View>

            {!isLastScreen ? (
              <Pressable
                onPress={handleContinue}
                accessibilityRole="button"
                accessibilityLabel={isLastScreen ? "Get started" : "Continue"}
                className="h-[52px] items-center justify-center rounded-[12px] bg-[#181818] active:bg-[#333333] elevation-1"
              >
                <Text className="text-base font-bold text-white">
                  {isLastScreen ? "Get Started" : "Continue"}
                </Text>
              </Pressable>
            ) : (
              <View className="">
                <Pressable
                  onPress={handleGoogleSignIn}
                  className="h-[52px] flex-row gap-4 items-center justify-center rounded-[12px] bg-[#fff] active:bg-[#fff] border border-[#181818] elevation-1"
                >
                  <GoogleIcon width={20} height={20} />

                  <Text className="text-base font-semibold text-[#181818]">
                    Sign in with Google
                  </Text>
                </Pressable>

                <View className="flex-row items-center my-6">
                  <View className="flex-1 h-[1px] bg-[#EAEAEA]" />

                  <Text className="mx-4 text-sm font-medium tracking-wide text-[#858585] uppercase">
                    or
                  </Text>
                  <View className="flex-1 h-[1px] bg-[#EAEAEA]" />
                </View>

                <Pressable
                  onPress={() => router.replace("/tabs/home")}
                  className="h-[52px] flex-row gap-4 items-center justify-center rounded-[12px] bg-[#181818] active:bg-[#333333] elevation-1"
                >
                  <User2 color={"#fff"} size={21} />
                  <Text className="text-base font-semibold text-white">
                    Continue as Guest
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Step indicator */}
            <Text className="mt-5 mb-2 text-center text-xs text-[#858585]">
              Understand before you trust.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

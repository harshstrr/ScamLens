import {
  getCurrentAccount,
  logout,
  signInWithGoogle,
} from "@/services/api-service";
import type { Account } from "@/services/api-types";
import { saveAuthResponse } from "@/services/auth-service";
import { useAuthStore } from "@/utils/sessionStorage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  FileText,
  Lock,
  LogOut,
  ShieldCheck,
  Sliders,
  Trash2,
  User,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const token = useAuthStore((state) => state.token);
  const storedAccount = useAuthStore((state) => state.account);
  const [account, setAccount] = useState<Account | null>(storedAccount);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showSignOut, setShowSignOut] = useState<boolean>(false);

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
    } catch (error: unknown) {
      Alert.alert(
        "Sign-in failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    let isActive = true;
    getCurrentAccount()
      .then((currentAccount) => {
        if (isActive) setAccount(currentAccount);
      })
      .catch((error: unknown) => {
        if (isActive) {
          Alert.alert(
            "Could not load account",
            error instanceof Error ? error.message : "Please try again.",
          );
        }
      });
    return () => {
      isActive = false;
    };
  }, [token]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#111113]" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="p-1 -ml-1 active:opacity-60"
        >
          <ArrowLeft
            size={22}
            color={isDark ? "#F5F5F7" : "#111827"}
            strokeWidth={2}
          />
        </Pressable>
        <Text className="text-[17px] font-bold text-[#111827] ml-4 dark:text-[#F5F5F7]">
          Settings
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-white dark:bg-[#111113]"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          <Text className="text-[32px] font-extrabold text-[#111827] tracking-tight mb-6 dark:text-[#F5F5F7]">
            Make it yours
          </Text>

          {/* Group 1: Privacy & Permissions Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] overflow-hidden mb-6 dark:border-[#3A3A3C]">
            <Pressable
              onPress={() => router.push("/privacy")}
              className="flex-row items-center p-4 active:bg-[#F9F9FB] dark:active:bg-[#2C2C2E]"
            >
              <View className="mr-3.5">
                <Lock
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Privacy & retention
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                  Local and account scan history
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={isDark ? "#71717A" : "#C7C7CC"}
                strokeWidth={2}
              />
            </Pressable>

            <View className="h-[1px] bg-[#E5E5EA] ml-12 dark:bg-[#3A3A3C]" />

            <Pressable
              onPress={() => router.push("/permission")}
              className="flex-row items-center p-4 active:bg-[#F9F9FB] dark:active:bg-[#2C2C2E]"
            >
              <View className="mr-3.5">
                <Sliders
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Permissions & notifications
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                  Screen capture asks every time
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={isDark ? "#71717A" : "#C7C7CC"}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          {/* Group 2: Data & Account Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] overflow-hidden mb-6 dark:border-[#3A3A3C]">
            <Pressable
              onPress={() => router.push("/data")}
              className="flex-row items-center p-4 active:bg-[#F9F9FB] dark:active:bg-[#2C2C2E]"
            >
              <View className="mr-3.5">
                <Database
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Data export & deletion
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={isDark ? "#71717A" : "#C7C7CC"}
                strokeWidth={2}
              />
            </Pressable>

            <View className="h-[1px] bg-[#E5E5EA] ml-12 dark:bg-[#3A3A3C]" />

            <Pressable
              onPress={() => router.push("/history" as any)}
              className="flex-row items-center p-4 active:bg-[#F9F9FB] dark:active:bg-[#2C2C2E]"
            >
              <View className="mr-3.5">
                <Trash2
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Delete all scan history
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={isDark ? "#71717A" : "#C7C7CC"}
                strokeWidth={2}
              />
            </Pressable>

            <View className="h-[1px] bg-[#E5E5EA] ml-12 dark:bg-[#3A3A3C]" />

            <Pressable
              onPress={() => {
                if (token) setShowSignOut(true);
                else handleGoogleSignIn();
              }}
              className="flex-row items-center p-4 active:bg-[#F9F9FB] dark:active:bg-[#2C2C2E]"
            >
              <View className="mr-3.5">
                <User
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Account
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                  {account?.email ??
                    (token
                      ? "Loading account..."
                      : "Not signed in. No account needed to scan.")}
                </Text>
              </View>
              {token ? (
                <Text className="text-[12px] font-semibold text-[#8E8E93] dark:text-[#A1A1AA]">
                  Sign out
                </Text>
              ) : (
                <ChevronRight
                  size={18}
                  color={isDark ? "#71717A" : "#C7C7CC"}
                  strokeWidth={2}
                />
              )}
            </Pressable>
          </View>

          {/* Group 3: Legal & About Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] overflow-hidden mb-10 dark:border-[#3A3A3C]">
            <Pressable
              onPress={() => router.push("/about")}
              className="flex-row items-center p-4 active:bg-[#F9F9FB] dark:active:bg-[#2C2C2E]"
            >
              <View className="mr-3.5">
                <ShieldCheck
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  About ScamLens
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={isDark ? "#71717A" : "#C7C7CC"}
                strokeWidth={2}
              />
            </Pressable>

            <View className="h-[1px] bg-[#E5E5EA] ml-12 dark:bg-[#3A3A3C]" />

            <Pressable
              onPress={() => router.push("/privacy-policy")}
              className="flex-row items-center p-4 active:bg-[#F9F9FB] dark:active:bg-[#2C2C2E]"
            >
              <View className="mr-3.5">
                <FileText
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Privacy policy
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={isDark ? "#71717A" : "#C7C7CC"}
                strokeWidth={2}
              />
            </Pressable>

            <View className="h-[1px] bg-[#E5E5EA] ml-12 dark:bg-[#3A3A3C]" />

            <Pressable
              onPress={() => router.push("/terms")}
              className="flex-row items-center p-4 active:bg-[#F9F9FB] dark:active:bg-[#2C2C2E]"
            >
              <View className="mr-3.5">
                <FileText
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Terms of use
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={isDark ? "#71717A" : "#C7C7CC"}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          {/* Version Footer */}
          <Text className="text-center text-[12px] text-[#8E8E93] pb-6 dark:text-[#A1A1AA]">
            ScamLens 1.0.0
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showSignOut}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSignOut(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSignOut(false)}>
          <View className="flex-1 bg-black/40 justify-center items-center px-6">
            <TouchableWithoutFeedback>
              <View className="w-full bg-white rounded-[28px] p-6 shadow-2xl dark:bg-[#1C1C1E]">
                {/* Trash Icon */}
                <View className="mb-4">
                  <LogOut
                    size={24}
                    color={isDark ? "#F5F5F7" : "#1C1C1E"}
                    strokeWidth={1.8}
                  />
                </View>

                {/* Title */}
                <Text className="text-[22px] font-bold text-[#1C1C1E] mb-3 dark:text-[#F5F5F7]">
                  Sign out of ScamLens?
                </Text>

                {/* Description */}
                <Text className="text-[14px] leading-5 text-[#8E8E93] mb-6 dark:text-[#A1A1AA]">
                  You'll need to sign in again to sync your scan history across
                  devices. Scans saved on this device will stay available.
                </Text>
                {/* Cancel Button */}
                <Pressable
                  onPress={() => setShowSignOut(false)}
                  className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-3 active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E]"
                >
                  <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                    Cancel
                  </Text>
                </Pressable>

                {/* Confirm Clear History Button */}
                <Pressable
                  onPress={async () => {
                    await logout();
                    setAccount(null);
                    setShowSignOut(false);
                  }}
                  className="w-full h-12 bg-[#1C1C1E] rounded-2xl items-center justify-center active:opacity-90 dark:bg-[#F5F5F7]"
                >
                  <Text className="text-[15px] font-semibold text-white dark:text-[#111113]">
                    Sign Out
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

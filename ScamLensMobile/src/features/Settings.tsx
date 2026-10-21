import React from "react";
import { View, Text, ScrollView, Pressable, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Lock,
  Sliders,
  Database,
  Trash2,
  User,
  ShieldCheck,
  FileText,
  ChevronRight,
} from "lucide-react-native";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="p-1 -ml-1 active:opacity-60"
        >
          <ArrowLeft size={22} color="#111827" strokeWidth={2} />
        </Pressable>
        <Text className="text-[17px] font-bold text-[#111827] ml-4">Settings</Text>
      </View>

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          <Text className="text-[32px] font-extrabold text-[#111827] tracking-tight mb-6">
            Make it yours
          </Text>

          {/* Group 1: Privacy & Permissions Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] overflow-hidden mb-6">
            <Pressable
              onPress={() => router.push("/privacy")}
              className="flex-row items-center p-4 active:bg-[#F9F9FB]"
            >
              <View className="mr-3.5">
                <Lock size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  Privacy & retention
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5">
                  Local history · 30 days
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>

            <View className="h-[1px] bg-[#E5E5EA] ml-12" />

            <Pressable
              onPress={() => router.push("/permission")}
              className="flex-row items-center p-4 active:bg-[#F9F9FB]"
            >
              <View className="mr-3.5">
                <Sliders size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  Permissions & notifications
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5">
                  Screen capture asks every time
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>
          </View>

          {/* Group 2: Data & Account Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] overflow-hidden mb-6">
            <Pressable
              onPress={() => router.push("/data")}
              className="flex-row items-center p-4 active:bg-[#F9F9FB]"
            >
              <View className="mr-3.5">
                <Database size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  Data export & deletion
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>

            <View className="h-[1px] bg-[#E5E5EA] ml-12" />

            <Pressable
              onPress={() => router.push("/history" as any)}
              className="flex-row items-center p-4 active:bg-[#F9F9FB]"
            >
              <View className="mr-3.5">
                <Trash2 size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  Delete all scan history
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>

            <View className="h-[1px] bg-[#E5E5EA] ml-12" />

            <Pressable className="flex-row items-center p-4 active:bg-[#F9F9FB]">
              <View className="mr-3.5">
                <User size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  Account
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5">
                  Not signed in. No account needed to scan.
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>
          </View>

          {/* Group 3: Legal & About Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] overflow-hidden mb-10">
            <Pressable className="flex-row items-center p-4 active:bg-[#F9F9FB]">
              <View className="mr-3.5">
                <ShieldCheck size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  About ScamLens
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>

            <View className="h-[1px] bg-[#E5E5EA] ml-12" />

            <Pressable className="flex-row items-center p-4 active:bg-[#F9F9FB]">
              <View className="mr-3.5">
                <FileText size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  Privacy policy
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>

            <View className="h-[1px] bg-[#E5E5EA] ml-12" />

            <Pressable className="flex-row items-center p-4 active:bg-[#F9F9FB]">
              <View className="mr-3.5">
                <FileText size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  Terms of use
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>
          </View>

          {/* Version Footer */}
          <Text className="text-center text-[12px] text-[#8E8E93] pb-6">
            ScamLens 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

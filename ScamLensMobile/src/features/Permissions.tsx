import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Cast,
  Image as ImageIcon,
  Clipboard,
  ChevronRight,
  Lock,
} from "lucide-react-native";
import { useRouter } from "expo-router";

export default function PermissionsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const [notifications, setNotifications] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#111113]" edges={["top"]}>

      {/* Header */}
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="p-1 -ml-1 active:opacity-60"
        >
          <ArrowLeft size={22} color={isDark ? "#F5F5F7" : "#111827"} strokeWidth={2} />
        </Pressable>
        <Text className="text-[17px] font-bold text-[#111827] ml-4 dark:text-[#F5F5F7]">
          Permissions & notifications
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-white dark:bg-[#111113]"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight mb-6 dark:text-[#F5F5F7]">
            Only what you choose to share
          </Text>

          {/* Screen Capture Card Box */}
          <View className="border border-[#E5E5EA] rounded-[24px] p-4 mb-6 dark:border-[#3A3A3C]">
            <Pressable className="flex-row items-center active:opacity-70 mb-3">
              <View className="mr-3.5">
                <Cast size={20} color={isDark ? "#F5F5F7" : "#1C1C1E"} strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Screen capture
                </Text>
                <Text className="text-[12px] leading-4 text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                  Ask every time · Requires Android consent for each session.
                </Text>
              </View>
              <ChevronRight size={18} color={isDark ? "#71717A" : "#C7C7CC"} strokeWidth={2} />
            </Pressable>
            <Text className="text-[12px] leading-4 text-[#8E8E93] dark:text-[#A1A1AA]">
              Protected screens may remain unreadable. You can stop sharing from
              Android at any time.
            </Text>
          </View>

          {/* Detailed Permissions Items */}
          <View className="mb-6 mx-2">
            <Pressable className="flex-row items-center py-3.5 active:opacity-70">
              <View className="mr-4">
                <ImageIcon size={20} color={isDark ? "#F5F5F7" : "#1C1C1E"} strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Screenshot access
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                  Selected images only · no full photo-library access.
                </Text>
              </View>
              <ChevronRight size={18} color={isDark ? "#71717A" : "#C7C7CC"} strokeWidth={2} />
            </Pressable>

            <Pressable className="flex-row items-center py-3.5 active:opacity-70">
              <View className="mr-4">
                <Clipboard size={20} color={isDark ? "#F5F5F7" : "#1C1C1E"} strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Clipboard
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                  Read only when you tap Paste from clipboard.
                </Text>
              </View>
              <ChevronRight size={18} color={isDark ? "#71717A" : "#C7C7CC"} strokeWidth={2} />
            </Pressable>
          </View>

          <View className="h-[1px] bg-[#E5E5EA] mb-6 dark:bg-[#3A3A3C]" />

          {/* Notification Toggle Row */}
          <View className="flex-row items-center justify-between mb-8">
            <View className="flex-1 pr-4">
              <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                Scan notifications
              </Text>
              <Text className="text-[13px] text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                {notifications
                  ? "On · Receive alerts when analysis finishes."
                  : "Off · Optional alerts when a scan finishes."}
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: isDark ? "#3A3A3C" : "#E5E5EA", true: isDark ? "#A1A1AA" : "#1C1C1E" }}
              thumbColor={isDark ? "#111113" : "#FFFFFF"}
            />
          </View>

          {/* Open Android Permissions */}
          <Pressable className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-5 active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E]">
            <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
              Open Android permission settings
            </Text>
          </Pressable>

          {/* Footer Note with lock */}
          <View className="flex-row items-start gap-2">
            <Lock size={14} color={isDark ? "#A1A1AA" : "#8E8E93"} strokeWidth={2} className="mt-0.5" />
            <Text className="flex-1 text-[12px] leading-4 text-[#8E8E93] dark:text-[#A1A1AA]">
              Denying screen access does not prevent manual text and link scans.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
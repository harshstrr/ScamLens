import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StatusBar, Switch } from "react-native";
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
  const [notifications, setNotifications] = useState(false);

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
        <Text className="text-[17px] font-bold text-[#111827] ml-4">
          Permissions & notifications
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight mb-6">
            Only what you choose to share
          </Text>

          {/* Screen Capture Card Box */}
          <View className="border border-[#E5E5EA] rounded-[24px] p-4 mb-6">
            <Pressable className="flex-row items-center active:opacity-70 mb-3">
              <View className="mr-3.5">
                <Cast size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  Screen capture
                </Text>
                <Text className="text-[12px] leading-4 text-[#8E8E93] mt-0.5">
                  Ask every time · Requires Android consent for each session.
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>
            <Text className="text-[12px] leading-4 text-[#8E8E93]">
              Protected screens may remain unreadable. You can stop sharing from
              Android at any time.
            </Text>
          </View>

          {/* Detailed Permissions Items */}
          <View className="mb-6 mx-2">
            <Pressable className="flex-row items-center py-3.5 active:opacity-70">
              <View className="mr-4">
                <ImageIcon size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  Screenshot access
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5">
                  Selected images only · no full photo-library access.
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>

            <Pressable className="flex-row items-center py-3.5 active:opacity-70">
              <View className="mr-4">
                <Clipboard size={20} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                  Clipboard
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5">
                  Read only when you tap Paste from clipboard.
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </Pressable>
          </View>

          <View className="h-[1px] bg-[#E5E5EA] mb-6" />

          {/* Notification Toggle Row */}
          <View className="flex-row items-center justify-between mb-8">
            <View className="flex-1 pr-4">
              <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                Scan notifications
              </Text>
              <Text className="text-[13px] text-[#8E8E93] mt-0.5">
                {notifications
                  ? "On · Receive alerts when analysis finishes."
                  : "Off · Optional alerts when a scan finishes."}
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#E5E5EA", true: "#1C1C1E" }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Open Android Permissions */}
          <Pressable className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-5 active:bg-[#F2F2F7]">
            <Text className="text-[15px] font-semibold text-[#1C1C1E]">
              Open Android permission settings
            </Text>
          </Pressable>

          {/* Footer Note with lock */}
          <View className="flex-row items-start gap-2">
            <Lock size={14} color="#8E8E93" strokeWidth={2} className="mt-0.5" />
            <Text className="flex-1 text-[12px] leading-4 text-[#8E8E93]">
              Denying screen access does not prevent manual text and link scans.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
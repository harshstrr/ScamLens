import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StatusBar, Switch, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Lock, FileText, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";

type RetentionOption = "7 days" | "30 days" | "Never";

export default function PrivacyRetentionScreen() {
  const router = useRouter();
  const [saveHistory, setSaveHistory] = useState(true);
  const [retention, setRetention] = useState<RetentionOption>("30 days");

  return (
    <SafeAreaView className="flex-1 bg-white">
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
          Privacy & retention
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight mb-3">
            You choose what stays.
          </Text>

          {/* Subtext with lock icon */}
          <View className="flex-row items-start gap-2 mb-6">
            <Lock size={14} color="#8E8E93" strokeWidth={2} className="mt-0.5" />
            <Text className="flex-1 text-[13px] leading-5 text-[#8E8E93]">
              Only submitted content is analyzed. ScamLens does not silently read
              other apps or your clipboard.
            </Text>
          </View>

          {/* Toggle Card */}
          <View className="border border-[#E5E5EA] rounded-[20px] p-4 mb-6 flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[15px] font-bold text-[#1C1C1E]">
                Save scan history
              </Text>
              <Text className="text-[12px] leading-4 text-[#8E8E93] mt-1">
                {saveHistory
                  ? "On · Store reports locally on this device. Turn off to keep no future history."
                  : "Off · No scan reports will be saved on this device."}
              </Text>
            </View>
            <Switch
              value={saveHistory}
              onValueChange={setSaveHistory}
              trackColor={{ false: "#E5E5EA", true: "#1C1C1E" }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Retention Options */}
          <Text className="text-[14px] font-bold text-[#1C1C1E] mb-3">
            Automatically delete local scans
          </Text>
          <View className="flex-row bg-[#F2F2F7] p-1 rounded-2xl mb-3">
            {(["7 days", "30 days", "Never"] as RetentionOption[]).map((opt) => {
              const active = retention === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setRetention(opt)}
                  // NativeWind Fix: Split completely into separate static conditional strings
                  className={
                    active
                      ? "flex-1 py-2.5 rounded-xl items-center justify-center bg-white shadow-sm elevation-1"
                      : "flex-1 py-2.5 rounded-xl items-center justify-center"
                  }
                  // Android elevation fallback style since tailwind shadow properties can drop out on Android
                  style={active && Platform.OS === 'android' ? { elevation: 1 } : null}
                >
                  <Text
                    className={
                      active
                        ? "text-[13px] font-bold text-[#1C1C1E]"
                        : "text-[13px] font-medium text-[#6B7280]"
                    }
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-[12px] leading-4 text-[#8E8E93] mb-6">
            Retention applies to local history, not analysis processing. “Never”
            keeps scans until you delete them.
          </Text>

          <View className="h-[1px] bg-[#E5E5EA] mb-4" />

          {/* Processing Link */}
          <Pressable className="flex-row items-center py-3 mb-6 active:opacity-70">
            <View className="mr-3.5">
              <FileText size={20} color="#1C1C1E" strokeWidth={1.8} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                Processing & submitted data
              </Text>
              <Text className="text-[13px] text-[#8E8E93] mt-0.5">
                Read how content is handled before scanning.
              </Text>
            </View>
            <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
          </Pressable>

          {/* Action Buttons */}
          <Pressable
            onPress={() => router.push("/scan-history" as any)}
            className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-3 active:bg-[#F2F2F7]"
          >
            <Text className="text-[15px] font-semibold text-[#1C1C1E]">
              Delete all scan history
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="w-full h-12 bg-[#1C1C1E] rounded-2xl items-center justify-center active:opacity-90"
          >
            <Text className="text-[15px] font-semibold text-white">
              Save preferences
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  Alert,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Lock, FileText, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  getHistoryPreferences,
  saveHistoryPreferences,
  type RetentionDays,
} from "@/services/scan-history-storage";

type RetentionOption = "7 days" | "30 days" | "Never";
const RETENTION_OPTIONS: RetentionOption[] = ["7 days", "30 days", "Never"];
const retentionToDays = (value: RetentionOption): RetentionDays =>
  value === "Never" ? null : value === "7 days" ? 7 : 30;
const daysToRetention = (value: RetentionDays): RetentionOption =>
  value === null ? "Never" : `${value} days`;

export default function PrivacyRetentionScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const [saveHistory, setSaveHistory] = useState(true);
  const [retention, setRetention] = useState<RetentionOption>("30 days");

  useEffect(() => {
    let isActive = true;
    getHistoryPreferences()
      .then((preferences) => {
        if (!isActive) return;
        setSaveHistory(preferences.enabled);
        setRetention(daysToRetention(preferences.retentionDays));
      })
      .catch((error: unknown) => {
        if (isActive) {
          Alert.alert(
            "Could not load preferences",
            error instanceof Error ? error.message : "Please try again.",
          );
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  const handleSaveHistoryChange = async (enabled: boolean) => {
    try {
      await saveHistoryPreferences({
        enabled,
        retentionDays: retentionToDays(retention),
      });
      setSaveHistory(enabled);
    } catch (error: unknown) {
      Alert.alert(
        "Could not save preference",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleRetentionChange = async (option: RetentionOption) => {
    try {
      await saveHistoryPreferences({
        enabled: saveHistory,
        retentionDays: retentionToDays(option),
      });
      setRetention(option);
    } catch (error: unknown) {
      Alert.alert(
        "Could not save preference",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#111113]">

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
          Privacy & retention
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-white dark:bg-[#111113]"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight mb-3 dark:text-[#F5F5F7]">
            You choose what stays.
          </Text>

          {/* Subtext with lock icon */}
          <View className="flex-row items-start gap-2 mb-6">
            <Lock size={14} color={isDark ? "#A1A1AA" : "#8E8E93"} strokeWidth={2} className="mt-0.5" />
            <Text className="flex-1 text-[13px] leading-5 text-[#8E8E93] dark:text-[#A1A1AA]">
              Only submitted content is analyzed. ScamLens does not silently read
              other apps or your clipboard.
            </Text>
          </View>

          {/* Toggle Card */}
          <View className="border border-[#E5E5EA] rounded-[20px] p-4 mb-6 flex-row items-center justify-between dark:border-[#3A3A3C]">
            <View className="flex-1 pr-4">
              <Text className="text-[15px] font-bold text-[#1C1C1E] dark:text-[#F5F5F7]">
                Save scan history
              </Text>
              <Text className="text-[12px] leading-4 text-[#8E8E93] mt-1 dark:text-[#A1A1AA]">
                {saveHistory
                  ? "On · Store reports locally on this device. Turn off to keep no future history."
                  : "Off · No scan reports will be saved on this device."}
              </Text>
            </View>
            <Switch
              value={saveHistory}
              onValueChange={handleSaveHistoryChange}
              trackColor={{ false: isDark ? "#3A3A3C" : "#E5E5EA", true: isDark ? "#A1A1AA" : "#1C1C1E" }}
              thumbColor={isDark ? "#111113" : "#FFFFFF"}
            />
          </View>

          {/* Retention Options */}
          <Text className="text-[14px] font-bold text-[#1C1C1E] mb-3 dark:text-[#F5F5F7]">
            Automatically delete local scans
          </Text>
          <View className="flex-row bg-[#F2F2F7] p-1 rounded-2xl mb-3 dark:bg-[#2C2C2E]">
            {RETENTION_OPTIONS.map((opt) => {
              const active = retention === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => handleRetentionChange(opt)}
                  // NativeWind Fix: Split completely into separate static conditional strings
                  className={
                    active
                      ? "flex-1 py-2.5 rounded-xl items-center justify-center bg-white shadow-sm elevation-1 dark:bg-[#3A3A3C]"
                      : "flex-1 py-2.5 rounded-xl items-center justify-center"
                  }
                  // Android elevation fallback style since tailwind shadow properties can drop out on Android
                  style={active && Platform.OS === 'android' ? { elevation: 1 } : null}
                >
                  <Text
                    className={
                      active
                        ? "text-[13px] font-bold text-[#1C1C1E] dark:text-[#F5F5F7]"
                        : "text-[13px] font-medium text-[#6B7280] dark:text-[#A1A1AA]"
                    }
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-[12px] leading-4 text-[#8E8E93] mb-6 dark:text-[#A1A1AA]">
            Retention applies to local history, not analysis processing. “Never”
            keeps scans until you delete them.
          </Text>

          <View className="h-[1px] bg-[#E5E5EA] mb-4 dark:bg-[#3A3A3C]" />

          {/* Processing Link */}
          <Pressable className="flex-row items-center py-3 mb-6 active:opacity-70">
            <View className="mr-3.5">
              <FileText size={20} color={isDark ? "#F5F5F7" : "#1C1C1E"} strokeWidth={1.8} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                Processing & submitted data
              </Text>
              <Text className="text-[13px] text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                Read how content is handled before scanning.
              </Text>
            </View>
            <ChevronRight size={18} color={isDark ? "#71717A" : "#C7C7CC"} strokeWidth={2} />
          </Pressable>

          {/* Action Buttons */}
          <Pressable
            onPress={() => router.push("/history")}
            className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-3 active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E]"
          >
            <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
              Delete all scan history
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="w-full h-12 bg-[#1C1C1E] rounded-2xl items-center justify-center active:opacity-90 dark:bg-[#F5F5F7]"
          >
            <Text className="text-[15px] font-semibold text-white dark:text-[#111113]">
              Save preferences
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

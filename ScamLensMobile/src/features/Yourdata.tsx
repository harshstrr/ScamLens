import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Upload, Trash2, Lock } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  clearLocalScans,
  getLocalScans,
} from "@/services/scan-history-storage";

export default function YourDataScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const [showClearModal, setShowClearModal] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    let isActive = true;
    getLocalScans()
      .then((scans) => {
        if (isActive) setScanCount(scans.length);
      })
      .catch((error: unknown) => {
        if (isActive) {
          Alert.alert(
            "Could not load local history",
            error instanceof Error ? error.message : "Please try again.",
          );
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  const handleClearHistory = async () => {
    try {
      await clearLocalScans();
      setScanCount(0);
      setShowClearModal(false);
    } catch (error: unknown) {
      Alert.alert(
        "Could not clear local history",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

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
        <Text className="text-[17px] font-bold text-[#111827] ml-4 dark:text-[#F5F5F7]">Your data</Text>
      </View>

      <ScrollView
        className="flex-1 bg-white dark:bg-[#111113]"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight mb-6 dark:text-[#F5F5F7]">
            Keep control of your history
          </Text>

          {/* Section 1: Export Local Reports Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] p-5 mb-5 dark:border-[#3A3A3C]">
            <View className="mb-3">
              <Upload size={22} color={isDark ? "#F5F5F7" : "#1C1C1E"} strokeWidth={1.8} />
            </View>
            <Text className="text-[16px] font-bold text-[#1C1C1E] mb-1.5 dark:text-[#F5F5F7]">
              Export local reports
            </Text>
            <Text className="text-[13px] leading-5 text-[#8E8E93] mb-5 dark:text-[#A1A1AA]">
              Export your saved reports as a text file. It may contain quoted
              messages and URLs. Choose where to save it carefully.
            </Text>
            <Pressable className="w-full h-12 border border-[#E5E5EA] rounded-xl items-center justify-center active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E]">
              <Text className="text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                Export {scanCount} saved reports
              </Text>
            </Pressable>
          </View>

          {/* Section 2: Delete Local History Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] p-5 mb-6 dark:border-[#3A3A3C]">
            <View className="mb-3">
              <Trash2 size={22} color={isDark ? "#F5F5F7" : "#1C1C1E"} strokeWidth={1.8} />
            </View>
            <Text className="text-[16px] font-bold text-[#1C1C1E] mb-1.5 dark:text-[#F5F5F7]">
              Delete local history
            </Text>
            <Text className="text-[13px] leading-5 text-[#8E8E93] mb-5 dark:text-[#A1A1AA]">
              Remove all saved scans from this device. You’ll be asked to
              confirm before anything is deleted.
            </Text>
            <Pressable
              onPress={() => setShowClearModal(true)}
              className="w-full h-12 border border-[#E5E5EA] rounded-xl items-center justify-center active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E]"
            >
              <Text className="text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                Delete all scan history
              </Text>
            </Pressable>
          </View>

          {/* Footer Note with lock */}
          <View className="flex-row items-start gap-2">
            <Lock size={14} color={isDark ? "#A1A1AA" : "#8E8E93"} strokeWidth={2} className="mt-0.5" />
            <Text className="flex-1 text-[12px] leading-4 text-[#8E8E93] dark:text-[#A1A1AA]">
              No account is connected. Account-data export or deletion is not
              applicable. Local deletion does not recall reports you already
              shared.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Clear Confirmation Modal */}
      <Modal
        visible={showClearModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowClearModal(false)}>
          <View className="flex-1 bg-black/40 justify-center items-center px-6">
            <TouchableWithoutFeedback>
              <View className="w-full bg-white rounded-[28px] p-6 shadow-2xl dark:bg-[#1C1C1E]">
                <View className="mb-4">
                  <Trash2 size={24} color={isDark ? "#F5F5F7" : "#1C1C1E"} strokeWidth={1.8} />
                </View>

                <Text className="text-[22px] font-bold text-[#1C1C1E] mb-3 dark:text-[#F5F5F7]">
                  Clear scan history?
                </Text>

                <Text className="text-[14px] leading-5 text-[#8E8E93] mb-6 dark:text-[#A1A1AA]">
                  All {scanCount} saved scans and their reports will be removed from this
                  device. This can’t be undone.
                </Text>

                <Pressable
                  onPress={() => setShowClearModal(false)}
                  className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-3 active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E]"
                >
                  <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleClearHistory}
                  className="w-full h-12 bg-[#1C1C1E] rounded-2xl items-center justify-center active:opacity-90 dark:bg-[#F5F5F7]"
                >
                  <Text className="text-[15px] font-semibold text-white dark:text-[#111113]">
                    Clear history
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
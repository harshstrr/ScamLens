import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Upload, Trash2, Lock } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function YourDataScreen() {
  const router = useRouter();
  const [showClearModal, setShowClearModal] = useState(false);

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
        <Text className="text-[17px] font-bold text-[#111827] ml-4">Your data</Text>
      </View>

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight mb-6">
            Keep control of your history
          </Text>

          {/* Section 1: Export Local Reports Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] p-5 mb-5">
            <View className="mb-3">
              <Upload size={22} color="#1C1C1E" strokeWidth={1.8} />
            </View>
            <Text className="text-[16px] font-bold text-[#1C1C1E] mb-1.5">
              Export local reports
            </Text>
            <Text className="text-[13px] leading-5 text-[#8E8E93] mb-5">
              Export your saved reports as a text file. It may contain quoted
              messages and URLs. Choose where to save it carefully.
            </Text>
            <Pressable className="w-full h-12 border border-[#E5E5EA] rounded-xl items-center justify-center active:bg-[#F2F2F7]">
              <Text className="text-[14px] font-semibold text-[#1C1C1E]">
                Export 5 saved reports
              </Text>
            </Pressable>
          </View>

          {/* Section 2: Delete Local History Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] p-5 mb-6">
            <View className="mb-3">
              <Trash2 size={22} color="#1C1C1E" strokeWidth={1.8} />
            </View>
            <Text className="text-[16px] font-bold text-[#1C1C1E] mb-1.5">
              Delete local history
            </Text>
            <Text className="text-[13px] leading-5 text-[#8E8E93] mb-5">
              Remove all saved scans from this device. You’ll be asked to
              confirm before anything is deleted.
            </Text>
            <Pressable
              onPress={() => setShowClearModal(true)}
              className="w-full h-12 border border-[#E5E5EA] rounded-xl items-center justify-center active:bg-[#F2F2F7]"
            >
              <Text className="text-[14px] font-semibold text-[#1C1C1E]">
                Delete all scan history
              </Text>
            </Pressable>
          </View>

          {/* Footer Note with lock */}
          <View className="flex-row items-start gap-2">
            <Lock size={14} color="#8E8E93" strokeWidth={2} className="mt-0.5" />
            <Text className="flex-1 text-[12px] leading-4 text-[#8E8E93]">
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
              <View className="w-full bg-white rounded-[28px] p-6 shadow-2xl">
                <View className="mb-4">
                  <Trash2 size={24} color="#1C1C1E" strokeWidth={1.8} />
                </View>

                <Text className="text-[22px] font-bold text-[#1C1C1E] mb-3">
                  Clear scan history?
                </Text>

                <Text className="text-[14px] leading-5 text-[#8E8E93] mb-6">
                  All 5 saved scans and their reports will be removed from this
                  device. This can’t be undone.
                </Text>

                <Pressable
                  onPress={() => setShowClearModal(false)}
                  className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-3 active:bg-[#F2F2F7]"
                >
                  <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowClearModal(false);
                    router.back();
                  }}
                  className="w-full h-12 bg-[#1C1C1E] rounded-2xl items-center justify-center active:opacity-90"
                >
                  <Text className="text-[15px] font-semibold text-white">
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
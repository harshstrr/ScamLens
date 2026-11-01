import { router } from "expo-router";
import {
  ArrowLeft,
  Cast,
  ChevronRight,
  Clipboard,
  Image as ImageIcon,
  Lock,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type InfoModal = "screenshot" | "clipboard" | null;

export default function PermissionsScreen() {
  const isDark = useColorScheme() === "dark";
  const [activeModal, setActiveModal] = useState<InfoModal>(null);

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error: unknown) {
      Alert.alert(
        "Could not open settings",
        error instanceof Error
          ? error.message
          : "Open your device settings to manage ScamLens permissions.",
      );
    }
  };

  const closeModal = () => setActiveModal(null);

  // Content + primary action for each modal
  const modalConfig = {
    screenshot: {
      Icon: ImageIcon,
      title: "Screenshot access",
      description:
        "ScamLens only reads images you select. It never gets access to your full photo library.",
      confirmLabel: "Choose image",
      onConfirm: () => {
        closeModal();
        router.push({
          pathname: "/tabs/scan",
          params: { mode: "media", requestId: String(Date.now()) },
        });
      },
    },
    clipboard: {
      Icon: Clipboard,
      title: "Clipboard",
      description:
        "ScamLens reads your clipboard only when you tap Paste. It never reads it in the background.",
      confirmLabel: "Go to scan",
      onConfirm: () => {
        closeModal();
        router.push("/tabs/home");
      },
    },
  } as const;

  const current = activeModal ? modalConfig[activeModal] : null;

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
            <Pressable
              onPress={openAppSettings}
              accessibilityRole="button"
              className="flex-row items-center active:opacity-70 mb-3"
            >
              <View className="mr-3.5">
                <Cast
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Screen capture
                </Text>
                <Text className="text-[12px] leading-4 text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                  Ask every time · Requires Android consent for each session.
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={isDark ? "#71717A" : "#C7C7CC"}
                strokeWidth={2}
              />
            </Pressable>
            <Text className="text-[12px] leading-4 text-[#8E8E93] dark:text-[#A1A1AA]">
              Protected screens may remain unreadable. You can stop sharing from
              Android at any time.
            </Text>
          </View>

          {/* Detailed Permissions Items */}
          <View className="mb-6 mx-2">
            <Pressable
              onPress={() => setActiveModal("screenshot")}
              accessibilityRole="button"
              accessibilityLabel="Screenshot access"
              className="flex-row items-center py-3.5 active:opacity-70"
            >
              <View className="mr-4">
                <ImageIcon
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Screenshot access
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                  Selected images only · no full photo-library access.
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={isDark ? "#71717A" : "#C7C7CC"}
                strokeWidth={2}
              />
            </Pressable>

            <Pressable
              onPress={() => setActiveModal("clipboard")}
              accessibilityRole="button"
              accessibilityLabel="Clipboard"
              className="flex-row items-center py-3.5 active:opacity-70"
            >
              <View className="mr-4">
                <Clipboard
                  size={20}
                  color={isDark ? "#F5F5F7" : "#1C1C1E"}
                  strokeWidth={1.8}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Clipboard
                </Text>
                <Text className="text-[13px] text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                  Read only when you tap Paste from clipboard.
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={isDark ? "#71717A" : "#C7C7CC"}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          <View className="h-[1px] bg-[#E5E5EA] mb-6 dark:bg-[#3A3A3C]" />

          {/* Open Android Permissions */}
          <Pressable
            onPress={openAppSettings}
            accessibilityRole="button"
            className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-5 active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E]"
          >
            <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
              Open app permission settings
            </Text>
          </Pressable>

          {/* Footer Note with lock */}
          <View className="flex-row items-start gap-2">
            <Lock
              size={14}
              color={isDark ? "#A1A1AA" : "#8E8E93"}
              strokeWidth={2}
              className="mt-0.5"
            />
            <Text className="flex-1 text-[12px] leading-4 text-[#8E8E93] dark:text-[#A1A1AA]">
              Denying screen access does not prevent manual text and link scans.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Info Modal (Screenshot access / Clipboard) */}
      <Modal
        visible={activeModal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View className="flex-1 bg-black/40 justify-center items-center px-6">
            <TouchableWithoutFeedback>
              <View className="w-full bg-white rounded-[28px] p-6 shadow-2xl dark:bg-[#1C1C1E]">
                {current ? (
                  <>
                    {/* Icon */}
                    <View className="mb-4">
                      <current.Icon
                        size={24}
                        color={isDark ? "#F5F5F7" : "#1C1C1E"}
                        strokeWidth={1.8}
                      />
                    </View>

                    {/* Title */}
                    <Text className="text-[22px] font-bold text-[#1C1C1E] mb-3 dark:text-[#F5F5F7]">
                      {current.title}
                    </Text>

                    {/* Description */}
                    <Text className="text-[14px] leading-5 text-[#8E8E93] mb-6 dark:text-[#A1A1AA]">
                      {current.description}
                    </Text>

                    {/* Cancel Button */}
                    <Pressable
                      onPress={closeModal}
                      className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-3 active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E]"
                    >
                      <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                        Cancel
                      </Text>
                    </Pressable>

                    {/* Confirm Button */}
                    <Pressable
                      onPress={current.onConfirm}
                      className="w-full h-12 bg-[#1C1C1E] rounded-2xl items-center justify-center active:opacity-90 dark:bg-[#F5F5F7]"
                    >
                      <Text className="text-[15px] font-semibold text-white dark:text-[#111113]">
                        {current.confirmLabel}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

import { ArrowLeft, Lock, Trash2, Upload } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
// If your Expo SDK is 53 or older, import from "expo-file-system" instead.
import {
  clearLocalScans,
  getLocalScans,
} from "@/services/scan-history-storage";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";

const APP_NAME = "ScamLens";
const EXPORT_FILE_NAME = "reports.json";

export default function YourDataScreen() {
  const isDark = useColorScheme() === "dark";
  const [showClearModal, setShowClearModal] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      // Always read fresh data so the export matches what's saved right now
      const scans = await getLocalScans();
      if (scans.length === 0) {
        Alert.alert("Nothing to export", "You have no saved reports yet.");
        return;
      }

      const baseDir = FileSystem.documentDirectory;
      if (!baseDir) throw new Error("Storage is not available on this device.");

      // <app documents>/ScamLens/reports.json
      const dirUri = `${baseDir}${APP_NAME}/`;
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
      const fileUri = `${dirUri}${EXPORT_FILE_NAME}`;

      const payload = {
        app: APP_NAME,
        exported_at: new Date().toISOString(),
        count: scans.length,
        reports: scans,
      };
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(payload, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 },
      );

      // Let the user save/share the file (Files, Drive, email, etc.)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          UTI: "public.json",
          dialogTitle: "Export ScamLens reports",
        });
      } else {
        Alert.alert("Reports exported", `Saved to:\n${fileUri}`);
      }
    } catch (error: unknown) {
      Alert.alert(
        "Could not export reports",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsExporting(false);
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
          <ArrowLeft
            size={22}
            color={isDark ? "#F5F5F7" : "#111827"}
            strokeWidth={2}
          />
        </Pressable>
        <Text className="text-[17px] font-bold text-[#111827] ml-4 dark:text-[#F5F5F7]">
          Your data
        </Text>
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
              <Upload
                size={22}
                color={isDark ? "#F5F5F7" : "#1C1C1E"}
                strokeWidth={1.8}
              />
            </View>
            <Text className="text-[16px] font-bold text-[#1C1C1E] mb-1.5 dark:text-[#F5F5F7]">
              Export local reports
            </Text>
            <Text className="text-[13px] leading-5 text-[#8E8E93] mb-5 dark:text-[#A1A1AA]">
              Export your saved reports as a JSON file. It may contain quoted
              messages and URLs. Choose where to save it carefully.
            </Text>
            <Pressable
              onPress={handleExport}
              disabled={isExporting || scanCount === 0}
              accessibilityRole="button"
              className={`w-full h-12 border border-[#E5E5EA] rounded-xl items-center justify-center active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E] ${
                scanCount === 0 ? "opacity-50" : ""
              }`}
            >
              {isExporting ? (
                <ActivityIndicator color={isDark ? "#F5F5F7" : "#1C1C1E"} />
              ) : (
                <Text className="text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Export {scanCount} saved reports
                </Text>
              )}
            </Pressable>
          </View>

          {/* Section 2: Delete Local History Card */}
          <View className="border border-[#E5E5EA] rounded-[24px] p-5 mb-6 dark:border-[#3A3A3C]">
            <View className="mb-3">
              <Trash2
                size={22}
                color={isDark ? "#F5F5F7" : "#1C1C1E"}
                strokeWidth={1.8}
              />
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
            <Lock
              size={14}
              color={isDark ? "#A1A1AA" : "#8E8E93"}
              strokeWidth={2}
              className="mt-0.5"
            />
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
                  <Trash2
                    size={24}
                    color={isDark ? "#F5F5F7" : "#1C1C1E"}
                    strokeWidth={1.8}
                  />
                </View>

                <Text className="text-[22px] font-bold text-[#1C1C1E] mb-3 dark:text-[#F5F5F7]">
                  Clear scan history?
                </Text>

                <Text className="text-[14px] leading-5 text-[#8E8E93] mb-6 dark:text-[#A1A1AA]">
                  All {scanCount} saved scans and their reports will be removed
                  from this device. This can’t be undone.
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

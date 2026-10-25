import { deleteAllScans, deleteScan, listScans } from "@/services/api-service";
import {
  clearLocalScans,
  getLocalScans,
  removeLocalScan,
  type LocalScan,
} from "@/services/scan-history-storage";
import { useAuthStore } from "@/utils/sessionStorage";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterType = "all" | "high" | "medium" | "low";
type RiskLevel = "high" | "medium" | "low" | "inconclusive";
type ItemType = "Message" | "Link" | "Screenshot";

interface ScanItem {
  id: string;
  isRemote: boolean;
  title: string;
  type: ItemType;
  date: string;
  riskLevel: RiskLevel;
  riskLabel: string;
}

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high", label: "High risk" },
  { key: "medium", label: "Medium risk" },
  { key: "low", label: "Low risk" },
];

const mapScan = (
  scan: LocalScan | import("@/services/api-types").ScanItem,
): ScanItem => {
  const riskLevel = scan.risk_level.toLowerCase();
  const normalizedRisk: RiskLevel =
    riskLevel === "high" || riskLevel === "medium" || riskLevel === "low"
      ? riskLevel
      : riskLevel === "safe"
        ? "low"
        : "inconclusive";
  const sourceType = scan.source_type.toLowerCase();

  return {
    id: "local_id" in scan ? scan.local_id : scan.id,
    isRemote: !("local_id" in scan),
    title:
      scan.source_title ||
      scan.source_url ||
      scan.summary.slice(0, 36) ||
      "Scan result",
    type:
      sourceType === "website"
        ? "Link"
        : sourceType === "image_ocr"
          ? "Screenshot"
          : "Message",
    date: new Date(scan.created_at).toLocaleString(),
    riskLevel: normalizedRisk,
    riskLabel:
      riskLevel === "safe"
        ? "Safe"
        : normalizedRisk === "inconclusive"
          ? "Inconclusive"
          : `${normalizedRisk[0].toUpperCase()}${normalizedRisk.slice(1)} risk`,
  };
};

export default function ScanHistoryScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const token = useAuthStore((state) => state.token);

  // Modal states
  const [itemToDelete, setItemToDelete] = useState<ScanItem | null>(null);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);

  const fetchScans = useCallback(async (): Promise<ScanItem[]> => {
    if (token) {
      const page = await listScans({ page: 1, page_size: 100 });
      return page.items.map(mapScan);
    }
    const localScans = await getLocalScans();
    return localScans.map(mapScan);
  }, [token]);

  useEffect(() => {
    let isActive = true;
    fetchScans()
      .then((items) => {
        if (isActive) setScans(items);
      })
      .catch((error: unknown) => {
        if (isActive) {
          Alert.alert(
            "Could not load scan history",
            error instanceof Error ? error.message : "Please try again.",
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [fetchScans]);

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.isRemote) {
        await deleteScan(itemToDelete.id);
      } else {
        await removeLocalScan(itemToDelete.id);
      }
      setScans((previous) =>
        previous.filter((item) => item.id !== itemToDelete.id),
      );
      setItemToDelete(null);
    } catch (error: unknown) {
      Alert.alert(
        "Could not delete scan",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const confirmClearAll = async () => {
    try {
      if (token) {
        await deleteAllScans();
      } else {
        await clearLocalScans();
      }
      setScans([]);
      setShowClearModal(false);
    } catch (error: unknown) {
      Alert.alert(
        "Could not clear history",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const filteredScans = scans.filter((item) => {
    if (activeFilter === "all") return true;
    return item.riskLevel === activeFilter;
  });

  const renderTypeIcon = (type: ItemType) => {
    switch (type) {
      case "Message":
        return (
          <MessageSquare
            size={20}
            color={isDark ? "#A1A1AA" : "#6B7280"}
            strokeWidth={1.8}
          />
        );
      case "Link":
        return (
          <Link2
            size={20}
            color={isDark ? "#A1A1AA" : "#6B7280"}
            strokeWidth={1.8}
          />
        );
      case "Screenshot":
        return (
          <ImageIcon
            size={20}
            color={isDark ? "#A1A1AA" : "#6B7280"}
            strokeWidth={1.8}
          />
        );
      default:
        return (
          <MessageSquare
            size={20}
            color={isDark ? "#A1A1AA" : "#6B7280"}
            strokeWidth={1.8}
          />
        );
    }
  };

  const renderRiskBadge = (riskLevel: RiskLevel, riskLabel: string) => {
    switch (riskLevel) {
      case "high":
        return (
          <View className="flex-row items-center gap-1.5 mt-1.5">
            <AlertTriangle size={15} color="#EF4444" strokeWidth={2.2} />
            <Text className="text-[14px] font-bold text-[#EF4444]">
              {riskLabel}
            </Text>
          </View>
        );
      case "medium":
        return (
          <View className="flex-row items-center gap-1.5 mt-1.5">
            <AlertTriangle size={15} color="#F97316" strokeWidth={2.2} />
            <Text className="text-[14px] font-bold text-[#F97316]">
              {riskLabel}
            </Text>
          </View>
        );
      case "low":
        return (
          <View className="flex-row items-center gap-1.5 mt-1.5">
            <CheckCircle2 size={15} color="#22C55E" strokeWidth={2.2} />
            <Text className="text-[14px] font-bold text-[#22C55E]">
              {riskLabel}
            </Text>
          </View>
        );
      case "inconclusive":
      default:
        return (
          <View className="flex-row items-center gap-1.5 mt-1.5">
            <HelpCircle
              size={15}
              color={isDark ? "#A1A1AA" : "#6B7280"}
              strokeWidth={2}
            />
            <Text className="text-[14px] font-bold text-[#4B5563] dark:text-[#D4D4D8]">
              {riskLabel}
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#111113]" edges={["top"]}>
      {/* Top Header */}
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
          Scan history
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-white dark:bg-[#111113]"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          {/* Main Title & Description */}
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight dark:text-[#F5F5F7]">
            Your recent checks
          </Text>
          <Text className="text-[14px] leading-5 text-[#8E8E93] mt-2 max-w-[92%] dark:text-[#A1A1AA]">
            {token
              ? "Saved to your account. Titles keep submitted message content out of the list."
              : "Saved on this device. Titles keep submitted message content out of the list."}
          </Text>

          {/* Segmented Filter Pills */}
          <View className="flex-row bg-[#F2F2F7] p-1 rounded-2xl mt-5 dark:bg-[#2C2C2E]">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveFilter(tab.key)}
                  style={[
                    styles.filterTab,
                    {
                      backgroundColor: isActive
                        ? isDark
                          ? "#3A3A3C"
                          : "#FFFFFF"
                        : "transparent",
                    },
                    isActive && styles.filterTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      isActive && styles.filterTextActive,
                      isDark &&
                        (isActive
                          ? styles.filterTextActiveDark
                          : styles.filterTextDark),
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Content Area */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center px-8 pt-16">
            <Text className="text-[14px] text-[#8E8E93] dark:text-[#A1A1AA]">
              Loading history...
            </Text>
          </View>
        ) : scans.length === 0 ? (
          /* Empty State View */
          <View className="flex-1 items-center justify-center px-8 pt-16">
            <View className="w-14 h-14 rounded-full border border-[#D1D5DB] items-center justify-center mb-6 dark:border-[#52525B]">
              <Clock
                size={28}
                color={isDark ? "#A1A1AA" : "#9CA3AF"}
                strokeWidth={1.8}
              />
            </View>

            <Text className="text-[22px] font-bold text-[#111827] text-center mb-2 dark:text-[#F5F5F7]">
              No scans yet
            </Text>

            <Text className="text-[14px] text-[#8E8E93] text-center leading-5 max-w-[280px] mb-8 dark:text-[#A1A1AA]">
              Start an analysis to see saved assessments here.
            </Text>

            <Pressable
              onPress={() => router.push("/tabs/home" as any)}
              className="w-full bg-[#1C1C1E] h-12 rounded-2xl items-center justify-center active:opacity-90 dark:bg-[#F5F5F7]"
            >
              <Text className="text-white text-[15px] font-semibold dark:text-[#111113]">
                Start a scan
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Populated List View */
          <View className="mt-7">
            {/* List Summary & Clear Action */}
            <View className="flex-row items-center justify-between px-5 mb-2">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] dark:text-[#A1A1AA]">
                {filteredScans.length} SCANS
              </Text>
              <Pressable onPress={() => setShowClearModal(true)} hitSlop={8}>
                <Text className="text-[12px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                  Clear history
                </Text>
              </Pressable>
            </View>

            {/* List Items */}
            <View>
              {filteredScans.map((scan) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/full_report",
                      params: {
                        id: scan.id,
                      },
                    })
                  }
                  key={scan.id}
                  className="flex-row items-start px-5 py-4 border-b border-[#F2F2F7] dark:border-[#2C2C2E]"
                >
                  {/* Left Type Icon */}
                  <View className="pt-0.5 mr-3.5">
                    {renderTypeIcon(scan.type)}
                  </View>

                  {/* Middle Info */}
                  <View className="flex-1 pr-3">
                    <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                      {scan.title}
                    </Text>
                    <Text className="text-[12px] text-[#8E8E93] mt-0.5 dark:text-[#A1A1AA]">
                      {scan.type} · {scan.date}
                    </Text>
                    {renderRiskBadge(scan.riskLevel, scan.riskLabel)}
                  </View>

                  {/* Delete Trash Icon Button */}
                  <Pressable
                    onPress={() => setItemToDelete(scan)}
                    hitSlop={10}
                    className="pt-1 active:opacity-60"
                  >
                    <Trash2
                      size={18}
                      color={isDark ? "#71717A" : "#9CA3AF"}
                      strokeWidth={1.8}
                    />
                  </Pressable>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 1. Modal: Delete Single Scan */}
      <Modal
        visible={!!itemToDelete}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setItemToDelete(null)}
      >
        <TouchableWithoutFeedback onPress={() => setItemToDelete(null)}>
          <View className="flex-1 bg-black/40 justify-center items-center px-6">
            <TouchableWithoutFeedback>
              <View className="w-full bg-white rounded-[28px] p-6 shadow-2xl dark:bg-[#1C1C1E]">
                {/* Trash Icon */}
                <View className="mb-4">
                  <Trash2
                    size={24}
                    color={isDark ? "#F5F5F7" : "#1C1C1E"}
                    strokeWidth={1.8}
                  />
                </View>

                {/* Title */}
                <Text className="text-[22px] font-bold text-[#1C1C1E] mb-3 dark:text-[#F5F5F7]">
                  Delete this scan?
                </Text>

                {/* Description */}
                <Text className="text-[14px] leading-5 text-[#8E8E93] mb-6 dark:text-[#A1A1AA]">
                  “{itemToDelete?.title}” and its saved report will be removed
                  {token ? " from your account" : " from this device"}. This
                  can’t be undone.
                </Text>

                {/* Cancel Button */}
                <Pressable
                  onPress={() => setItemToDelete(null)}
                  className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-3 active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E]"
                >
                  <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                    Cancel
                  </Text>
                </Pressable>

                {/* Confirm Delete Button */}
                <Pressable
                  onPress={confirmDeleteItem}
                  className="w-full h-12 bg-[#1C1C1E] rounded-2xl items-center justify-center active:opacity-90 dark:bg-[#F5F5F7]"
                >
                  <Text className="text-[15px] font-semibold text-white dark:text-[#111113]">
                    Delete scan
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 2. Modal: Clear All History */}
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
                {/* Trash Icon */}
                <View className="mb-4">
                  <Trash2
                    size={24}
                    color={isDark ? "#F5F5F7" : "#1C1C1E"}
                    strokeWidth={1.8}
                  />
                </View>

                {/* Title */}
                <Text className="text-[22px] font-bold text-[#1C1C1E] mb-3 dark:text-[#F5F5F7]">
                  Clear scan history?
                </Text>

                {/* Description */}
                <Text className="text-[14px] leading-5 text-[#8E8E93] mb-6 dark:text-[#A1A1AA]">
                  All {scans.length} saved scans and their reports will be
                  removed{token ? " from your account" : " from this device"}.
                  This can’t be undone.
                </Text>

                {/* Cancel Button */}
                <Pressable
                  onPress={() => setShowClearModal(false)}
                  className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-3 active:bg-[#F2F2F7] dark:border-[#3A3A3C] dark:active:bg-[#2C2C2E]"
                >
                  <Text className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                    Cancel
                  </Text>
                </Pressable>

                {/* Confirm Clear History Button */}
                <Pressable
                  onPress={confirmClearAll}
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

const styles = StyleSheet.create({
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterTabActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterTextDark: {
    color: "#A1A1AA",
  },
  filterTextActiveDark: {
    color: "#F5F5F7",
  },
  filterTextActive: {
    fontWeight: "700",
    color: "#111827",
  },
});

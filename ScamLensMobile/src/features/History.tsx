import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Trash2,
  MessageSquare,
  Link2,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Clock,
} from "lucide-react-native";
import { useRouter } from "expo-router";

type FilterType = "all" | "high" | "medium" | "low";
type RiskLevel = "high" | "medium" | "low" | "inconclusive";
type ItemType = "Message" | "Link" | "Screenshot";

interface ScanItem {
  id: string;
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

const INITIAL_SCANS: ScanItem[] = [
  {
    id: "1",
    title: "Delivery message",
    type: "Message",
    date: "Today · 09:24",
    riskLevel: "medium",
    riskLabel: "Medium risk",
  },
  {
    id: "2",
    title: "Shared payment link",
    type: "Link",
    date: "Today · 08:58",
    riskLevel: "high",
    riskLabel: "High risk",
  },
  {
    id: "3",
    title: "Appointment reminder",
    type: "Message",
    date: "Yesterday · 18:42",
    riskLevel: "low",
    riskLabel: "Low risk",
  },
  {
    id: "4",
    title: "Short message",
    type: "Screenshot",
    date: "Yesterday · 10:18",
    riskLevel: "inconclusive",
    riskLabel: "Inconclusive",
  },
  {
    id: "5",
    title: "Job offer",
    type: "Message",
    date: "16 Oct 2026 · 14:06",
    riskLevel: "high",
    riskLabel: "High risk",
  },
];

export default function ScanHistoryScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [scans, setScans] = useState<ScanItem[]>(INITIAL_SCANS);

  // Modal states
  const [itemToDelete, setItemToDelete] = useState<ScanItem | null>(null);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);

  // Single Item Deletion
  const confirmDeleteItem = () => {
    if (itemToDelete) {
      setScans((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      setItemToDelete(null);
    }
  };

  // Clear All History
  const confirmClearAll = () => {
    setScans([]);
    setShowClearModal(false);
  };

  const filteredScans = scans.filter((item) => {
    if (activeFilter === "all") return true;
    return item.riskLevel === activeFilter;
  });

  const renderTypeIcon = (type: ItemType) => {
    switch (type) {
      case "Message":
        return <MessageSquare size={20} color="#6B7280" strokeWidth={1.8} />;
      case "Link":
        return <Link2 size={20} color="#6B7280" strokeWidth={1.8} />;
      case "Screenshot":
        return <ImageIcon size={20} color="#6B7280" strokeWidth={1.8} />;
      default:
        return <MessageSquare size={20} color="#6B7280" strokeWidth={1.8} />;
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
            <HelpCircle size={15} color="#6B7280" strokeWidth={2} />
            <Text className="text-[14px] font-bold text-[#4B5563]">
              {riskLabel}
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="p-1 -ml-1 active:opacity-60"
        >
          <ArrowLeft size={22} color="#111827" strokeWidth={2} />
        </Pressable>
        <Text className="text-[17px] font-bold text-[#111827] ml-4">
          Scan history
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4">
          {/* Main Title & Description */}
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight">
            Your recent checks
          </Text>
          <Text className="text-[14px] leading-5 text-[#8E8E93] mt-2 max-w-[92%]">
            Saved on this device. Titles keep sensitive message content out of
            the list.
          </Text>

          {/* Segmented Filter Pills */}
          <View className="flex-row bg-[#F2F2F7] p-1 rounded-2xl mt-5">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveFilter(tab.key)}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      isActive && styles.filterTextActive,
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
        {scans.length === 0 ? (
          /* Empty State View */
          <View className="flex-1 items-center justify-center px-8 pt-16">
            <View className="w-14 h-14 rounded-full border border-[#D1D5DB] items-center justify-center mb-6">
              <Clock size={28} color="#9CA3AF" strokeWidth={1.8} />
            </View>

            <Text className="text-[22px] font-bold text-[#111827] text-center mb-2">
              No scans yet
            </Text>

            <Text className="text-[14px] text-[#8E8E93] text-center leading-5 max-w-[280px] mb-8">
              Start a scan to see your saved assessments here. You can turn
              history off in Privacy.
            </Text>

            <Pressable
              onPress={() => router.push("/tabs/home" as any)}
              className="w-full bg-[#1C1C1E] h-12 rounded-2xl items-center justify-center active:opacity-90"
            >
              <Text className="text-white text-[15px] font-semibold">
                Start a scan
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Populated List View */
          <View className="mt-7">
            {/* List Summary & Clear Action */}
            <View className="flex-row items-center justify-between px-5 mb-2">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                {filteredScans.length} SCANS · ILLUSTRATIVE
              </Text>
              <Pressable onPress={() => setShowClearModal(true)} hitSlop={8}>
                <Text className="text-[12px] font-semibold text-[#1C1C1E]">
                  Clear history
                </Text>
              </Pressable>
            </View>

            {/* List Items */}
            <View>
              {filteredScans.map((scan) => (
                <View
                  key={scan.id}
                  className="flex-row items-start px-5 py-4 border-b border-[#F2F2F7]"
                >
                  {/* Left Type Icon */}
                  <View className="pt-0.5 mr-3.5">
                    {renderTypeIcon(scan.type)}
                  </View>

                  {/* Middle Info */}
                  <View className="flex-1 pr-3">
                    <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                      {scan.title}
                    </Text>
                    <Text className="text-[12px] text-[#8E8E93] mt-0.5">
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
                    <Trash2 size={18} color="#9CA3AF" strokeWidth={1.8} />
                  </Pressable>
                </View>
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
              <View className="w-full bg-white rounded-[28px] p-6 shadow-2xl">
                {/* Trash Icon */}
                <View className="mb-4">
                  <Trash2 size={24} color="#1C1C1E" strokeWidth={1.8} />
                </View>

                {/* Title */}
                <Text className="text-[22px] font-bold text-[#1C1C1E] mb-3">
                  Delete this scan?
                </Text>

                {/* Description */}
                <Text className="text-[14px] leading-5 text-[#8E8E93] mb-6">
                  “{itemToDelete?.title}” and its saved report will be removed
                  from this device. This can’t be undone.
                </Text>

                {/* Cancel Button */}
                <Pressable
                  onPress={() => setItemToDelete(null)}
                  className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-3 active:bg-[#F2F2F7]"
                >
                  <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                    Cancel
                  </Text>
                </Pressable>

                {/* Confirm Delete Button */}
                <Pressable
                  onPress={confirmDeleteItem}
                  className="w-full h-12 bg-[#1C1C1E] rounded-2xl items-center justify-center active:opacity-90"
                >
                  <Text className="text-[15px] font-semibold text-white">
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
              <View className="w-full bg-white rounded-[28px] p-6 shadow-2xl">
                {/* Trash Icon */}
                <View className="mb-4">
                  <Trash2 size={24} color="#1C1C1E" strokeWidth={1.8} />
                </View>

                {/* Title */}
                <Text className="text-[22px] font-bold text-[#1C1C1E] mb-3">
                  Clear scan history?
                </Text>

                {/* Description */}
                <Text className="text-[14px] leading-5 text-[#8E8E93] mb-6">
                  All {scans.length} saved scans and their reports will be
                  removed from this device. This can’t be undone.
                </Text>

                {/* Cancel Button */}
                <Pressable
                  onPress={() => setShowClearModal(false)}
                  className="w-full h-12 border border-[#E5E5EA] rounded-2xl items-center justify-center mb-3 active:bg-[#F2F2F7]"
                >
                  <Text className="text-[15px] font-semibold text-[#1C1C1E]">
                    Cancel
                  </Text>
                </Pressable>

                {/* Confirm Clear History Button */}
                <Pressable
                  onPress={confirmClearAll}
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

const styles = StyleSheet.create({
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterTabActive: {
    backgroundColor: "#FFFFFF",
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
  filterTextActive: {
    fontWeight: "700",
    color: "#111827",
  },
});
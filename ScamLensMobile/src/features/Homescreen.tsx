import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import {
  Shield,
  Upload,
  Share2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  History,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function Homescreen() {
  const [inputText, setInputText] = useState("");

  const recentScans = [
    {
      id: "11",
      title: "Delivery message",
      type: "Message",
      time: "Today, 09:24",
      risk: "Medium risk",
      riskLevel: "medium",
    },
    {
      id: "22",
      title: "Shared payment link",
      type: "Link",
      time: "Yesterday, 18:42",
      risk: "High risk",
      riskLevel: "high",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <ScrollView
        className="flex-1 bg-white px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Top Header Section */}
        <View className="flex-row items-center mt-6 mb-8">
          <View className="flex-row items-center gap-2">
            <Shield size={26} color="#000000" strokeWidth={1.8} />
            <Text className="text-xl font-bold tracking-tight text-[#000000]">
              ScamLens
            </Text>
          </View>
        </View>

        {/* Hero Headlines */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-[#8E8E93] mb-1">
            A little clarity goes a long way.
          </Text>
          <Text className="text-[32px] font-bold leading-[38px] tracking-tight text-[#1C1C1E]">
            Think something feels off?
          </Text>
        </View>

        {/* Core Analysis Container Box */}
        <View className="bg-[#FAFAFC] border border-[#F2F2F7] rounded-[24px] p-5 mb-8">
          <Text className="text-lg font-bold text-[#1C1C1E] mb-4">
            Check before you trust.
          </Text>

          <View className="bg-white border border-[#E5E5EA] rounded-xl px-4 py-3 min-h-[8rem] mb-4">
            <TextInput
              placeholder="Paste a message or suspicious link..."
              placeholderTextColor="#AEAEB2"
              multiline
              value={inputText}
              onChangeText={setInputText}
              className="flex-1 text-base text-[#1C1C1E] p-0"
            />
          </View>

          <Pressable className="bg-[#1C1C1E] h-12 rounded-xl items-center justify-center active:opacity-90 mb-5">
            <Text className="text-base font-bold text-white text-center">
              Analyze now
            </Text>
          </Pressable>

          <View className="flex-row justify-around pt-1 border-t border-[#F2F2F7]">
            <Pressable className="flex-row items-center gap-2 py-2">
              <Upload size={16} color="#1C1C1E" strokeWidth={2} />
              <Text className="text-sm font-semibold text-[#1C1C1E]">
                Scan screenshot
              </Text>
            </Pressable>
            <Pressable className="flex-row items-center gap-2 py-2">
              <Share2 size={16} color="#1C1C1E" strokeWidth={2} />
              <Text className="text-sm font-semibold text-[#1C1C1E]">
                Share link
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Scans Section */}
        <View className="mt-4">
         <View className="flex-row justify-between items-center mb-4">
  <Text className="text-lg font-bold text-[#1C1C1E]">
    Recent scans
  </Text>
  <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/history")} className="flex-row items-center gap-1.5">
    <History size={20} color={"#282829"} />
    <Text className="text-lg font-semibold text-[#282829]">
      History
    </Text>
  </TouchableOpacity>
</View>


          <View className="gap-y-4 mb-6">
            {recentScans.map((scan) => (
              <View
                key={scan.id}
                className="flex-row justify-between items-center"
              >
                <View className="flex-1 pr-4">
                  <Text className="text-base font-semibold text-[#1C1C1E] mb-0.5">
                    {scan.title}
                  </Text>
                  <Text className="text-xs text-[#8E8E93]">
                    {scan.type} · {scan.time}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5 w-[110px] justify-end">
                  {scan.riskLevel === "high" && (
                    <>
                      <AlertCircle
                        size={16}
                        color="#FF3B30"
                        strokeWidth={2.5}
                      />
                      <Text className="text-sm font-bold text-[#FF3B30]">
                        {scan.risk}
                      </Text>
                    </>
                  )}
                  {scan.riskLevel === "medium" && (
                    <>
                      <AlertTriangle
                        size={16}
                        color="#FF9500"
                        strokeWidth={2.5}
                      />
                      <Text className="text-sm font-bold text-[#FF9500]">
                        {scan.risk}
                      </Text>
                    </>
                  )}
                  {scan.riskLevel === "low" && (
                    <>
                      <CheckCircle2
                        size={16}
                        color="#34C759"
                        strokeWidth={2.5}
                      />
                      <Text className="text-sm font-bold text-[#34C759]">
                        {scan.risk}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
  },
  tabTextActive: {
    color: "#1C1C1E",
  },
});

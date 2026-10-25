import { analyzeScan, listScans } from "@/services/api-service";
import type { ScanItem, ScanResult } from "@/services/api-types";
import {
  getLocalScans,
  saveLocalScan,
  type LocalScan,
} from "@/services/scan-history-storage";
import { useAuthStore } from "@/utils/sessionStorage";
import { router, useFocusEffect } from "expo-router";
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  History,
  Shield,
  Upload,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface RecentScan {
  id: string;
  title: string;
  type: string;
  time: string;
  risk: string;
  riskLevel: string;
}

const getRiskLabel = (riskLevel: string): string =>
  riskLevel === "safe" ? "Safe" : `${riskLevel} risk`;

const toRecentScan = (scan: ScanItem | LocalScan): RecentScan => ({
  id: "local_id" in scan ? scan.local_id : scan.id,
  title:
    scan.source_title ||
    scan.source_url ||
    scan.summary.slice(0, 36) ||
    "Scan result",
  type:
    scan.source_type === "website"
      ? "Link"
      : scan.source_type === "image_ocr"
        ? "Screenshot"
        : "Message",
  time: new Date(scan.created_at).toLocaleString(),
  risk: getRiskLabel(scan.risk_level),
  riskLevel: scan.risk_level === "safe" ? "low" : scan.risk_level,
});

export default function Homescreen() {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const token = useAuthStore((state) => state.token);
  const isDark = useColorScheme() === "dark";

  const fetchRecentScans = useCallback(async (): Promise<RecentScan[]> => {
    if (token) {
      const page = await listScans({ page: 1, page_size: 5 });
      return page.items.map(toRecentScan);
    }
    const scans = await getLocalScans();
    return scans.slice(0, 5).map(toRecentScan);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      fetchRecentScans()
        .then((scans) => {
          if (isActive) setRecentScans(scans);
        })
        .catch((error: unknown) => {
          if (isActive) {
            Alert.alert(
              "Could not load scans",
              error instanceof Error ? error.message : "Please try again.",
            );
          }
        });
      return () => {
        isActive = false;
      };
    }, [fetchRecentScans]),
  );

  const handleAnalyze = async () => {
    const text = inputText.trim();
    if (!text || isAnalyzing) return;

    const isUrl = /^https?:\/\/\S+$/i.test(text);
    if (text.length > 40000 || (isUrl && text.length > 2048)) {
      Alert.alert(
        "Input is too long",
        isUrl
          ? "Links must be 2,048 characters or fewer."
          : "Text must be 40,000 characters or fewer.",
      );
      return;
    }
    setIsAnalyzing(true);
    try {
      const result: ScanResult = await analyzeScan({
        text,
        source_type: isUrl ? "website" : "message",
        source_url: isUrl ? text : null,
        source_title: isUrl ? text.slice(0, 512) : null,
        save_to_history: Boolean(token),
        save_content: Boolean(token),
      });

      if (!token) {
        try {
          await saveLocalScan(result);
        } catch (error: unknown) {
          Alert.alert(
            "Analysis complete, but history was not saved",
            error instanceof Error ? error.message : "Please try again.",
          );
        }
      }
      setInputText("");
      Alert.alert(
        getRiskLabel(result.risk_level),
        `${result.summary}\n\nRisk score: ${result.risk_score}/100`,
      );
      try {
        setRecentScans(await fetchRecentScans());
      } catch (error: unknown) {
        Alert.alert(
          "Could not refresh recent scans",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    } catch (error: unknown) {
      Alert.alert(
        "Analysis failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#111113]">
      <ScrollView
        className="flex-1 bg-white px-6 dark:bg-[#111113]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Top Header Section */}
        <View className="flex-row items-center mt-6 mb-8">
          <View className="flex-row items-center gap-2">
            <Shield
              size={26}
              color={isDark ? "#F5F5F7" : "#000000"}
              strokeWidth={1.8}
            />
            <Text className="text-xl font-bold tracking-tight text-[#000000] dark:text-[#F5F5F7]">
              ScamLens
            </Text>
          </View>
        </View>

        {/* Hero Headlines */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-[#8E8E93] mb-1 dark:text-[#A1A1AA]">
            A little clarity goes a long way.
          </Text>
          <Text className="text-[32px] font-bold leading-[38px] tracking-tight text-[#1C1C1E] dark:text-[#F5F5F7]">
            Think something feels off?
          </Text>
        </View>

        {/* Core Analysis Container Box */}
        <View className="bg-[#FAFAFC] border border-[#F2F2F7] rounded-[24px] p-5 mb-8 dark:bg-[#1C1C1E] dark:border-[#3A3A3C]">
          <Text className="text-lg font-bold text-[#1C1C1E] mb-4 dark:text-[#F5F5F7]">
            Check before you trust.
          </Text>

          <View className="bg-white border border-[#E5E5EA] rounded-xl px-4 py-3 min-h-[8rem] mb-4 dark:bg-[#111113] dark:border-[#3A3A3C]">
            <TextInput
              placeholder="Paste a message or suspicious link..."
              placeholderTextColor="#AEAEB2"
              multiline
              maxLength={40000}
              value={inputText}
              onChangeText={setInputText}
              className="flex-1 text-base text-[#1C1C1E] p-0 dark:text-[#F5F5F7]"
            />
          </View>

          <Pressable
            onPress={handleAnalyze}
            disabled={isAnalyzing || !inputText.trim()}
            className="bg-[#1C1C1E] h-12 rounded-xl items-center justify-center active:opacity-90 mb-5 dark:bg-[#F5F5F7]"
          >
            <Text className="text-base font-bold text-white text-center dark:text-[#111113]">
              {isAnalyzing ? "Analyzing..." : "Analyze now"}
            </Text>
          </Pressable>

          <View className="flex-row justify-around pt-1 border-t border-[#F2F2F7] dark:border-[#3A3A3C]">
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/tabs/scan",
                  params: { mode: "media" },
                })
              }
              className="flex-row items-center gap-2 py-2"
            >
              <Upload
                size={16}
                color={isDark ? "#F5F5F7" : "#1C1C1E"}
                strokeWidth={2}
              />
              <Text className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                Choose image
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/tabs/scan",
                  params: { mode: "camera" },
                })
              }
              className="flex-row items-center gap-2 py-2"
            >
              <Camera
                size={16}
                color={isDark ? "#F5F5F7" : "#1C1C1E"}
                strokeWidth={2}
              />
              <Text className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                Use camera
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Scans Section */}
        <View className="mt-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-[#1C1C1E] dark:text-[#F5F5F7]">
              Recent scans
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/history")}
              className="flex-row items-center gap-1.5"
            >
              <History size={20} color={isDark ? "#F5F5F7" : "#282829"} />
              <Text className="text-lg font-semibold text-[#282829] dark:text-[#F5F5F7]">
                History
              </Text>
            </TouchableOpacity>
          </View>

          <View className="gap-y-4 mb-6">
            {recentScans.map((scan) => (
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
                className="flex-row justify-between items-center"
              >
                <View className="flex-1 pr-4">
                  <Text className="text-base font-semibold text-[#1C1C1E] mb-0.5 dark:text-[#F5F5F7]">
                    {scan.title}
                  </Text>
                  <Text className="text-xs text-[#8E8E93] dark:text-[#A1A1AA]">
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
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

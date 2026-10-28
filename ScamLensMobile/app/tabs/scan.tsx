import { analyzeScan } from "@/services/api-service";
import type { ScanResult } from "@/services/api-types";
import { getStoredToken } from "@/services/auth-service";
import {
  getHistoryPreferences,
  saveLocalScan,
} from "@/services/scan-history-storage";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type CaptureMode = "camera" | "media";
type ScanStatus =
  | "selecting"
  | "extracting"
  | "analyzing"
  | "complete"
  | "error";

const getRiskStyle = (level: string | undefined, isDark: boolean) => {
  switch (level) {
    case "safe":
    case "low":
      return { color: isDark ? "#4ADE80" : "#16A34A", Icon: ShieldCheck }; // green
    case "medium":
      return { color: isDark ? "#FB923C" : "#EA580C", Icon: AlertTriangle }; // orange
    default: // high, critical, unknown
      return { color: isDark ? "#F87171" : "#DC2626", Icon: ShieldAlert }; // red
  }
};

const describeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "Please try again.";
  if (message.includes("@react-native-ml-kit/text-recognition")) {
    return "Text recognition needs the installed Android/iOS development build. Rebuild the app, then try again.";
  }
  return message;
};

export default function ImageScanScreen() {
  const isDark = useColorScheme() === "dark";
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const initialMode: CaptureMode = mode === "camera" ? "camera" : "media";
  const started = useRef(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(initialMode);
  const [status, setStatus] = useState<ScanStatus>("selecting");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState("Screenshot");
  const [extractedText, setExtractedText] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [historyWarning, setHistoryWarning] = useState("");
  const riskStyle = result ? getRiskStyle(result.risk_level, isDark) : null;

  const insets = useSafeAreaInsets();
  const analyzeText = useCallback(
    async (text: string, title = sourceTitle) => {
      const content = text.trim();
      if (!content) {
        setErrorMessage("No text was found. Try a clearer image.");
        setStatus("error");
        return;
      }
      if (content.length > 40000) {
        setErrorMessage(
          "The extracted text is over the 40,000 character limit.",
        );
        setStatus("error");
        return;
      }

      setErrorMessage("");
      setStatus("analyzing");
      const token = getStoredToken();
      try {
        const historyPreferences = await getHistoryPreferences();
        const scanResult = await analyzeScan({
          text: content,
          source_type: "image_ocr",
          source_title: title.slice(0, 512),
          save_to_history: Boolean(token) && historyPreferences.enabled,
          save_content: Boolean(token) && historyPreferences.enabled,
        });

        console.log(scanResult);
        let reportResult = scanResult;
        try {
          reportResult = (await saveLocalScan(scanResult)) ?? scanResult;
        } catch (error: unknown) {
          setHistoryWarning(
            error instanceof Error
              ? `Scan finished, but it could not be saved locally: ${error.message}`
              : "Scan finished, but it could not be saved locally.",
          );
        }
        setResult(reportResult);
        setStatus("complete");
      } catch (error: unknown) {
        setErrorMessage(describeError(error));
        setStatus("error");
      }
    },
    [sourceTitle],
  );

  const recognizeAndAnalyze = useCallback(
    async (uri: string, title: string) => {
      setStatus("extracting");
      setErrorMessage("");
      setResult(null);
      try {
        const recognition = await TextRecognition.recognize(uri);
        const text = recognition.text.trim();
        if (!text) {
          setErrorMessage("No text was found. Try a clearer image.");
          setStatus("error");
          return;
        }
        setExtractedText(text.slice(0, 40000));
        await analyzeText(text.slice(0, 40000), title);
      } catch (error: unknown) {
        setErrorMessage(describeError(error));
        setStatus("error");
      }
    },
    [analyzeText],
  );

  const captureImage = useCallback(
    async (nextMode: CaptureMode) => {
      setCaptureMode(nextMode);
      setStatus("selecting");
      setErrorMessage("");

      try {
        let asset: ImagePicker.ImagePickerAsset | undefined;
        if (nextMode === "camera") {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            throw new Error("Allow camera access in Settings to take a photo.");
          }
          const selection = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.85,
          });
          if (selection.canceled) {
            router.back();
            return;
          }
          asset = selection.assets[0];
        } else {
          const selection = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.85,
          });
          if (selection.canceled) {
            router.back();
            return;
          }
          asset = selection.assets[0];
        }

        if (!asset) {
          throw new Error("The selected image could not be loaded.");
        }
        setImageUri(asset.uri);
        setSourceTitle(asset.fileName || "Screenshot");
        await recognizeAndAnalyze(asset.uri, asset.fileName || "Screenshot");
      } catch (error: unknown) {
        setErrorMessage(describeError(error));
        setStatus("error");
      }
    },
    [recognizeAndAnalyze],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      void captureImage(initialMode);
    }, 0);
    return () => clearTimeout(timer);
  }, [captureImage, initialMode]);

  const isBusy =
    status === "selecting" || status === "extracting" || status === "analyzing";
  const riskLabel = result
    ? result.risk_level === "safe"
      ? "Safe"
      : `${result.risk_level[0].toUpperCase()}${result.risk_level.slice(1)} risk`
    : "";

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#111113]">
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          className="p-1 -ml-1"
        >
          <ArrowLeft
            size={22}
            color={isDark ? "#F5F5F7" : "#111827"}
            strokeWidth={2}
          />
        </Pressable>
        <Text className="text-[17px] font-bold text-[#111827] ml-4 dark:text-[#F5F5F7]">
          Scan an image
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 100,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {imageUri ? (
          <View className="flex items-center border-[1px] rounded-2xl border-dashed border-[#888282ad]">
            <Image
              source={{ uri: imageUri }}
              accessibilityLabel="Selected image"
              resizeMode="cover"
              style={{
                width: "98%",
                height: 280,
                backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
                borderRadius: 16,
              }}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setImageUri(null)}
              className=" h-10 w-10 rounded-full absolute -top-3.5 -right-3 dark:bg-[#F2F2F7] items-center justify-center bg-[#2C2C2E]"
            >
              <X size={20} color={"#F2F2F7"} />
            </TouchableOpacity>
          </View>
        ) : (
          <Pressable className="h-[180px] border-1 border-[#1b1b1b] rounded-2xl bg-[#F2F2F7] items-center justify-center dark:bg-[#2C2C2E]">
            <ImageIcon size={36} color={isDark ? "#A1A1AA" : "#8E8E93"} />
            <Text className="text-sm text-[#8E8E93] mt-3 dark:text-[#A1A1AA]">
              Select a screenshot or take a photo
            </Text>
          </Pressable>
        )}

        {isBusy ? (
          <View className="flex-row items-center justify-center py-8">
            <ActivityIndicator color={isDark ? "#F5F5F7" : "#1C1C1E"} />
            <Text className="text-sm text-[#6B7280] ml-3 dark:text-[#A1A1AA]">
              {status === "selecting"
                ? "Opening image..."
                : status === "extracting"
                  ? "Extracting text..."
                  : "Analyzing text..."}
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 dark:border-[#7F1D1D] dark:bg-[#3F1D1D]">
            <Text className="text-sm leading-5 text-[#991B1B] dark:text-[#FECACA]">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {extractedText ? (
          <View className="mt-6">
            <Text className="text-base font-bold text-[#1C1C1E] mb-2 dark:text-[#F5F5F7]">
              Extracted text
            </Text>
            <TextInput
              value={extractedText}
              onChangeText={setExtractedText}
              multiline
              maxLength={40000}
              editable={!isBusy}
              accessibilityLabel="Extracted text to analyze"
              className="min-h-[280px] rounded-xl border border-[#E5E5EA] p-3 text-sm leading-5 text-[#1C1C1E] dark:border-[#3A3A3C] dark:text-[#F5F5F7]"
              textAlignVertical="top"
            />
          </View>
        ) : null}

        {result && riskStyle ? (
          <View className="mt-5 rounded-2xl border border-[#E5E5EA] p-4 dark:border-[#3A3A3C]">
            <View className="flex-row items-center">
              <riskStyle.Icon
                size={24}
                color={riskStyle.color}
                strokeWidth={2.2}
              />
              <Text className="text-lg font-bold ml-2 text-[#1C1C1E] dark:text-[#F5F5F7]">
                <Text style={{ color: riskStyle.color }}>{riskLabel}</Text>
                {" · "}
                {result.risk_score}/100
              </Text>
            </View>
            <Text className="text-sm leading-5 text-[#555555] mt-2 dark:text-[#D4D4D8]">
              {result.summary}
            </Text>
            {result.recommendations?.length ? (
              <Text className="text-sm leading-5 text-[#555555] mt-3 dark:text-[#D4D4D8]">
                {result.recommendations.join("\n")}
              </Text>
            ) : null}
          </View>
        ) : null}
        {historyWarning ? (
          <Text className="text-sm text-[#9A6700] mt-4">{historyWarning}</Text>
        ) : null}

        {extractedText && !isBusy ? (
          <Pressable
            onPress={() => {
              if (result) {
                router.push({
                  pathname: "/full_report",
                  params: {
                    id: result.id,
                  },
                });
              } else {
                void analyzeText(extractedText);
              }
            }}
            className="h-12 rounded-xl bg-[#1C1C1E] items-center justify-center mt-5 dark:bg-[#F5F5F7]"
          >
            <Text className="text-base font-bold text-white dark:text-[#111113]">
              {result ? "View Full Report" : "Analyze extracted text"}
            </Text>
          </Pressable>
        ) : null}

        {!isBusy ? (
          <View className="flex-row gap-3 mt-4">
            <Pressable
              onPress={() => void captureImage("media")}
              className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-xl border border-[#E5E5EA] dark:border-[#3A3A3C]"
            >
              <ImageIcon size={18} color={isDark ? "#F5F5F7" : "#1C1C1E"} />
              <Text className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                Choose image
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void captureImage("camera")}
              className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-xl border border-[#E5E5EA] dark:border-[#3A3A3C]"
            >
              {captureMode === "camera" ? (
                <RotateCcw size={18} color={isDark ? "#F5F5F7" : "#1C1C1E"} />
              ) : (
                <Camera size={18} color={isDark ? "#F5F5F7" : "#1C1C1E"} />
              )}
              <Text className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F5F5F7]">
                Take photo
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

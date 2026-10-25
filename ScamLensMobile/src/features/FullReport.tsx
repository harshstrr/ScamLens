import { getScan } from "@/services/api-service";
import type { ScanResult } from "@/services/api-types";
import { router, useLocalSearchParams } from "expo-router";
import {
    AlertTriangle,
    ArrowLeft,
    RotateCcw,
    ShieldAlert,
    ShieldCheck,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getRiskStyle = (level: string | undefined, isDark: boolean) => {
  switch (level) {
    case "safe":
    case "low":
      return { color: isDark ? "#4ADE80" : "#16A34A", Icon: ShieldCheck };
    case "medium":
      return { color: isDark ? "#FB923C" : "#EA580C", Icon: AlertTriangle };
    default:
      return { color: isDark ? "#F87171" : "#DC2626", Icon: ShieldAlert };
  }
};

const formatLabel = (value: string | null | undefined) =>
  value
    ? value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase())
    : "—";

const formatDate = (iso: string | undefined) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-5">
      <Text className="text-base font-bold text-[#1C1C1E] mb-2 dark:text-[#F5F5F7]">
        {title}
      </Text>
      <View className="rounded-2xl border border-[#E5E5EA] p-4 dark:border-[#3A3A3C]">
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row justify-between py-2 ${
        last ? "" : "border-b border-[#E5E5EA] dark:border-[#3A3A3C]"
      }`}
    >
      <Text className="text-sm text-[#6B7280] dark:text-[#A1A1AA]">
        {label}
      </Text>
      <Text
        className="text-sm font-semibold text-[#1C1C1E] ml-4 flex-1 text-right dark:text-[#F5F5F7]"
        style={valueColor ? { color: valueColor } : undefined}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

// Findings shape isn't fixed, so render strings or objects defensively.
function FindingItem({ finding, index }: { finding: unknown; index: number }) {
  if (typeof finding === "string") {
    return (
      <Text className="text-sm leading-5 text-[#555555] mt-2 dark:text-[#D4D4D8]">
        {index + 1}. {finding}
      </Text>
    );
  }
  const f = (finding ?? {}) as Record<string, unknown>;
  const title = (f.title ?? f.type ?? f.category ?? f.name) as
    | string
    | undefined;
  const description = (f.description ?? f.detail ?? f.message ?? f.reason) as
    | string
    | undefined;
  const severity = (f.severity ?? f.risk_level) as string | undefined;

  return (
    <View
      className={`${index > 0 ? "mt-3 pt-3 border-t border-[#E5E5EA] dark:border-[#3A3A3C]" : ""}`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-[#1C1C1E] flex-1 dark:text-[#F5F5F7]">
          {title ? formatLabel(title) : `Finding ${index + 1}`}
        </Text>
        {severity ? (
          <Text className="text-xs font-semibold text-[#6B7280] ml-2 dark:text-[#A1A1AA]">
            {formatLabel(severity)}
          </Text>
        ) : null}
      </View>
      <Text className="text-sm leading-5 text-[#555555] mt-1 dark:text-[#D4D4D8]">
        {description ?? JSON.stringify(finding)}
      </Text>
    </View>
  );
}

export default function ScanReportScreen() {
  const isDark = useColorScheme() === "dark";
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) {
      setError("Missing scan id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = (await getScan(id)) as any;
      console.log(data);
      setScan(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load the report.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      void load();
    }
  }, [id, load]);

  const risk = scan ? getRiskStyle(scan.risk_level, isDark) : null;
  const riskLabel = scan
    ? scan.risk_level === "safe"
      ? "Safe"
      : `${scan.risk_level[0].toUpperCase()}${scan.risk_level.slice(1)} risk`
    : "";
  const findings = (scan?.findings ?? []) as unknown[];
  const iconColor = isDark ? "#F5F5F7" : "#111827";

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
          <ArrowLeft size={22} color={iconColor} strokeWidth={2} />
        </Pressable>
        <Text className="text-[17px] font-bold text-[#111827] ml-4 dark:text-[#F5F5F7]">
          Full report
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={isDark ? "#F5F5F7" : "#1C1C1E"} />
          <Text className="text-sm text-[#6B7280] mt-3 dark:text-[#A1A1AA]">
            Loading report...
          </Text>
        </View>
      ) : error || !scan || !risk ? (
        <View className="flex-1 px-5 pt-4">
          <View className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 dark:border-[#7F1D1D] dark:bg-[#3F1D1D]">
            <Text className="text-sm leading-5 text-[#991B1B] dark:text-[#FECACA]">
              {error || "Report not found."}
            </Text>
          </View>
          <Pressable
            onPress={() => void load()}
            className="h-12 rounded-xl bg-[#1C1C1E] flex-row items-center justify-center gap-2 mt-4 dark:bg-[#F5F5F7]"
          >
            <RotateCcw size={18} color={isDark ? "#111113" : "#FFFFFF"} />
            <Text className="text-base font-bold text-white dark:text-[#111113]">
              Try again
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        >
          {/* Hero */}
          <View className="rounded-2xl border border-[#E5E5EA] p-4 dark:border-[#3A3A3C]">
            <View className="flex-row items-center">
              <risk.Icon size={28} color={risk.color} strokeWidth={2.2} />
              <Text className="text-xl font-bold ml-2 text-[#1C1C1E] dark:text-[#F5F5F7]">
                <Text style={{ color: risk.color }}>{riskLabel}</Text>
                {" · "}
                {scan.risk_score}/100
              </Text>
            </View>
            <View className="h-2 rounded-full mt-3 overflow-hidden bg-[#E5E5EA] dark:bg-[#3A3A3C]">
              <View
                style={{
                  width: `${Math.min(Math.max(scan.risk_score, 2), 100)}%`,
                  height: "100%",
                  backgroundColor: risk.color,
                  borderRadius: 999,
                }}
              />
            </View>
            <Text className="text-sm leading-5 text-[#555555] mt-3 dark:text-[#D4D4D8]">
              {scan.summary}
            </Text>
          </View>

          <Section title="Overview">
            <Row label="Verdict" value={formatLabel(scan.verdict)} />
            <Row label="Category" value={formatLabel(scan.primary_category)} />
            <Row label="Confidence" value={formatLabel(scan.confidence)} />
            <Row
              label="Marked safe"
              value={scan.is_safe ? "Yes" : "No"}
              valueColor={scan.is_safe ? risk.color : undefined}
            />
            <Row
              label="Critical indicators"
              value={scan.critical_indicators ? "Yes" : "None"}
              last
            />
          </Section>

          <Section title="Score breakdown">
            <Row label="Fraud" value={String(scan.scores?.fraud_score ?? 0)} />
            <Row label="Spam" value={String(scan.scores?.spam_score ?? 0)} />
            <Row
              label="Legitimate"
              value={String(scan.scores?.legitimate_score ?? 0)}
              last
            />
          </Section>

          <Section title={`Findings (${findings.length})`}>
            {findings.length ? (
              findings.map((finding, i) => (
                <FindingItem key={i} finding={finding} index={i} />
              ))
            ) : (
              <Text className="text-sm leading-5 text-[#555555] dark:text-[#D4D4D8]">
                No scam indicators were found in this content.
              </Text>
            )}
          </Section>

          <Section title="Recommendations">
            {scan.recommendations?.length ? (
              scan.recommendations.map((rec, i) => (
                <View key={i} className={`flex-row ${i > 0 ? "mt-2" : ""}`}>
                  <Text style={{ color: risk.color }}>• </Text>
                  <Text className="flex-1 text-sm leading-5 text-[#555555] dark:text-[#D4D4D8]">
                    {rec}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-[#555555] dark:text-[#D4D4D8]">
                No recommendations.
              </Text>
            )}
          </Section>

          <Section title="Source">
            <Row label="Type" value={formatLabel(scan.source_type)} />
            <Row label="Title" value={scan.source_title || "—"} />
            <Row label="URL" value={scan.source_url || "—"} last />
          </Section>

          <Section title="Details">
            <Row label="Scan ID" value={scan.id} />
            <Row label="Analysis version" value={scan.analysis_version} />
            <Row label="Scanned at" value={formatDate(scan.created_at)} />
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

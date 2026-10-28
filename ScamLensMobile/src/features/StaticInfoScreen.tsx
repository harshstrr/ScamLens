import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import {
  ScrollView,
  Text,
  Pressable,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type InfoPage = "about" | "privacy" | "terms";

const PAGE_CONTENT: Record<
  InfoPage,
  { title: string; sections: { heading: string; body: string }[] }
> = {
  about: {
    title: "About ScamLens",
    sections: [
      {
        heading: "Check before you trust",
        body: "ScamLens helps you review suspicious links and messages by highlighting risk signals, explaining findings, and suggesting safer next steps.",
      },
      {
        heading: "How a scan works",
        body: "A scan is started only when you submit text, a link, or selected image text for analysis. ScamLens returns an assessment with a risk score, findings, and recommendations.",
      },
      {
        heading: "Use your judgment",
        body: "Automated assessments can be incomplete or incorrect. ScamLens is a decision-support tool, not a guarantee that content is safe or fraudulent. Verify important requests independently.",
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    sections: [
      {
        heading: "Information you submit",
        body: "ScamLens processes the text, links, and image text you choose to submit for a scan. Avoid submitting passwords, payment details, government identifiers, or other sensitive information.",
      },
      {
        heading: "Local scan history",
        body: "When scan history is enabled, report details are stored on this device. Local history is set to automatically remove scans after 30 days by default. You can choose 7 days, 30 days, or Never in Privacy & retention, or clear history at any time.",
      },
      {
        heading: "Account history",
        body: "When you are signed in and scan history is enabled, scans may also be saved to your account. The history toggle controls whether new scans are saved locally and to your account. Account scans are not removed by the local retention setting; manage them from Scan history.",
      },
      {
        heading: "Permissions and control",
        body: "ScamLens does not silently read other apps or your clipboard. Camera or image access is requested only when you choose an image scanning action. You can manage app permissions in your device settings.",
      },
      {
        heading: "Managing your data",
        body: "Turn off Save scan history to stop saving future reports, or use the history and data controls in Settings to remove saved scans. Turning history off does not automatically delete reports saved earlier.",
      },
    ],
  },
  terms: {
    title: "Terms of use",
    sections: [
      {
        heading: "Using ScamLens",
        body: "You may use ScamLens to review content you are authorized to submit. You are responsible for the content you provide and for complying with applicable laws and third-party rights.",
      },
      {
        heading: "Assessments are not guarantees",
        body: "ScamLens assessments are generated automatically and may be inaccurate, incomplete, or out of date. A low-risk or safe result is not a guarantee. Verify links and requests through trusted, independent channels before acting.",
      },
      {
        heading: "No professional advice",
        body: "ScamLens provides general informational guidance only. It does not provide legal, financial, cybersecurity incident-response, or other professional advice.",
      },
      {
        heading: "Availability and acceptable use",
        body: "Features may change or become temporarily unavailable. Do not misuse the service, interfere with its operation, or submit content that you have no right to share.",
      },
      {
        heading: "Your choices",
        body: "You can control whether future reports are saved in Privacy & retention and delete saved reports from the history controls. Use of the app is also subject to the privacy practices described in the Privacy policy.",
      },
    ],
  },
};

export default function StaticInfoScreen({ page }: { page: InfoPage }) {
  const isDark = useColorScheme() === "dark";
  const content = PAGE_CONTENT[page];
  const iconColor = isDark ? "#F5F5F7" : "#111827";

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#111113]" edges={["top"]}>
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
          {content.title}
        </Text>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      >
        {content.sections.map((section) => (
          <View
            key={section.heading}
            className="mb-4 rounded-2xl border border-[#E5E5EA] p-4 dark:border-[#3A3A3C]"
          >
            <Text className="text-base font-bold text-[#1C1C1E] dark:text-[#F5F5F7]">
              {section.heading}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-[#555555] dark:text-[#D4D4D8]">
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export interface Account {
  id: string;
  email: string;
  display_name: string | null;
  picture_url: string | null;
}

export interface AuthResponse {
  access_token: string;
  secret_key: string;
  expires_in: number;
  secret_key_expires_in: number;
  user: Account;
}

export type ScanSourceType = "website" | "message" | "image_ocr" | "quick_scan";

export interface AnalyzeRequest {
  text: string;
  source_url?: string | null;
  source_type: ScanSourceType;
  source_title?: string | null;
  save_to_history?: boolean;
  save_content?: boolean;
}

export interface Finding {
  code: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  points: number;
}

export interface CategoryScores {
  fraud_score: number;
  spam_score: number;
  legitimate_score: number;
}

export interface ScanResult {
  id?: string | null;
  source_type: ScanSourceType;
  source_url?: string | null;
  source_title?: string | null;
  verdict:
    | "SCAM_OR_FRAUD_DETECTED"
    | "SPAM_OR_HIGH_RISK"
    | "LOW_RISK_CONTENT"
    | "LEGITIMATE_CONTENT";
  is_safe: boolean;
  primary_category: "fraud" | "spam" | "legitimate";
  risk_level: "high" | "medium" | "low" | "safe";
  risk_score: number;
  confidence: "low" | "medium" | "high" | "very_high";
  critical_indicators: boolean;
  scores: CategoryScores;
  summary: string;
  findings?: Finding[];
  recommendations?: string[];
  analysis_version: string;
  created_at: string;
  saved_to_history?: boolean;
}

export interface ScanItem {
  id: string;
  source_type: string;
  source_url: string | null;
  source_title: string | null;
  risk_level: string;
  risk_score: number;
  confidence: string;
  summary: string;
  findings: Record<string, unknown>[];
  recommendations: string[];
  analysis_version: string;
  created_at: string;
}

export interface ScanPage {
  items: ScanItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface ListScansParams {
  page?: number;
  page_size?: number;
}

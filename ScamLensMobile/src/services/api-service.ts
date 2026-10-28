import { api } from "./api-client";
import type {
  Account,
  AnalyzeRequest,
  AuthResponse,
  ListScansParams,
  ScanPage,
  ScanResult,
} from "./api-types";
import { clearStoredToken, saveAuthResponse } from "./auth-service";

export const getApiRoot = async (): Promise<unknown> => {
  const baseURL = api.defaults.baseURL?.replace(/\/api\/v1\/?$/, "");
  const { data } = await api.get("/", { baseURL });
  return data;
};

export const getHealth = async (): Promise<unknown> => {
  const baseURL = api.defaults.baseURL?.replace(/\/api\/v1\/?$/, "");
  const { data } = await api.get("/health", { baseURL });
  return data;
};

export const signInWithGoogle = async (
  idToken: string,
): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>("/auth/google", {
    id_token: idToken,
  });
  return data;
};

export const refreshAccessToken = async (
  secretKey: string,
): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>("/auth/refresh", {
    secret_key: secretKey,
  });
  await saveAuthResponse(data);
  return data;
};

export const getCurrentAccount = async (): Promise<Account> => {
  const { data } = await api.get<Account>("/auth/me");
  return data;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout");
  } finally {
    clearStoredToken();
  }
};

export const analyzeScan = async (
  payload: AnalyzeRequest,
): Promise<ScanResult> => {
  const { data } = await api.post<ScanResult>("/scans/analyze", payload);
  return data;
};

export const listScans = async (
  params: ListScansParams = {},
): Promise<ScanPage> => {
  const { data } = await api.get<ScanPage>("/scans", { params });
  return data;
};

export const getScan = async (scanId: string): Promise<ScanResult> => {
  const { data } = await api.get<ScanResult>(
    `/scans/${encodeURIComponent(scanId)}`,
  );
  return data;
};

export const deleteScan = async (scanId: string): Promise<void> => {
  await api.delete(`/scans/${encodeURIComponent(scanId)}`);
};

export const deleteAllScans = async (): Promise<void> => {
  await api.delete("/scans");
};

export const deleteAccount = async (): Promise<void> => {
  await api.delete("/account");
  clearStoredToken();
};

export const sign_in_google = async (payload: {
  id_token: string;
}): Promise<AuthResponse> => signInWithGoogle(payload.id_token);

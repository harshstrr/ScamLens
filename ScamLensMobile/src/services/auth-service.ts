
import { create } from "axios";
import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

import { useAuthStore } from "@/utils/sessionStorage";
import type { AuthResponse } from "./api-types";
import { api } from "./http-client";

type SecureCredentials = {
  accessToken: string;
  secretKey: string;
};

type MyModuleType = {
  getCredentials(): Promise<SecureCredentials | null>;
  saveCredentials(
    accessToken: string,
    secretKey: string
  ): Promise<boolean>;
  clearCredentials(): Promise<boolean>;
};

const getSecureStore = (): MyModuleType => {
  if (Platform.OS !== "android") {
    throw new Error("Secure native credential storage is Android-only.");
  }

  return requireNativeModule<MyModuleType>("MyModule");
};

const refreshApi = create({
  baseURL: api.defaults.baseURL,
  timeout: api.defaults.timeout,
  headers: { "Content-Type": "application/json" },
});

export const saveAuthResponse = async (
  response: AuthResponse
): Promise<void> => {
  // Persist credentials securely before updating the authenticated state.
  if (Platform.OS === "android") {
    await getSecureStore().saveCredentials(
      response.access_token,
      response.secret_key
    );
  }

  const auth = useAuthStore.getState();
  auth.setToken(response.access_token, response.secret_key);
  auth.setAccount(response.user);
};


export const restoreSecureCredentials = async (): Promise<void> => {
  if (Platform.OS !== "android") return;

  // Wait until Zustand has finished reading its persisted state first.
  await useAuthStore.persist.rehydrate();

  // Then restore the real credentials from Android secure storage.
  const credentials = await getSecureStore().getCredentials();

  if (!credentials) return;

  useAuthStore.getState().setToken(
    credentials.accessToken,
    credentials.secretKey
  );
};

export const generateToken = async (): Promise<string> => {
  let secretKey = useAuthStore.getState().secretKey;

  // Recover the rotating credential after an app restart if necessary.
  if (!secretKey && Platform.OS === "android") {
    const credentials = await getSecureStore().getCredentials();

    if (credentials) {
      secretKey = credentials.secretKey;

      useAuthStore.getState().setToken(
        credentials.accessToken,
        credentials.secretKey
      );
    }
  }

  if (!secretKey) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const { data } = await refreshApi.post<AuthResponse>(
    "/auth/refresh",
    { secret_key: secretKey }
  );

  // Save the newly rotated secret_key before using the new session.
  await saveAuthResponse(data);

  return data.access_token;
};

export const getStoredToken = (): string | null => {
  return useAuthStore.getState().token;
};

export const refreshToken = async (): Promise<string> => {
  return generateToken();
};

export const clearStoredToken = async (): Promise<void> => {
  useAuthStore.getState().clearToken();

  if (Platform.OS === "android") {
    await getSecureStore().clearCredentials();
  }
};
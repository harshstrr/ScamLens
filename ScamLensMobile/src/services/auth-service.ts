import { useAuthStore } from "@/utils/sessionStorage";
import { storage } from "@/utils/Store";
import { api } from "./http-client";

/**
 * Generate access token
 */
export const generateToken = async (): Promise<string> => {
  const response = await api.post("/auth/refresh", {
  refreshToken: await storage.getItem("refreshToken")
  });


  const token = response.data.accessToken;

  useAuthStore.getState().setToken(token);

  return token;
};

/**
 * Get currently stored token
 */
export const getStoredToken = (): string | null => {
  return useAuthStore.getState().token;
};

/**
 * Refresh access token
 */
export const refreshToken = async (): Promise<string> => {
  return generateToken();
};

/**
 * Clear stored token
 */
export const clearStoredToken = (): void => {
  useAuthStore.getState().setToken("");
};
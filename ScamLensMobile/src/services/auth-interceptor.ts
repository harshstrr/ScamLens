
import {
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";

import {
  clearStoredToken,
  getStoredToken,
  refreshToken,
  restoreSecureCredentials,
} from "./auth-service";

import { api } from "./http-client";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

let isRegistered = false;
let credentialsReady: Promise<void> | null = null;

export const initializeAuth = (): Promise<void> => {
  if (!credentialsReady) {
    credentialsReady = restoreSecureCredentials().catch((error: unknown) => {
      credentialsReady = null;
      throw error;
    });
  }

  return credentialsReady;
};

export const registerAuthInterceptor = (): void => {
  if (isRegistered) return;
  isRegistered = true;

  api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      await initializeAuth();

      const token = getStoredToken();

      if (token) {
        if (!(config.headers instanceof AxiosHeaders)) {
          config.headers = new AxiosHeaders(config.headers);
        }

        config.headers.set("Authorization", `Bearer ${token}`);
      }

      return config;
    },
  );

  api.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const axiosError = error as {
        config?: InternalAxiosRequestConfig;
        response?: { status?: number };
      };

      const originalRequest = axiosError.config;
      const isRefreshRequest =
        originalRequest?.url?.includes("/auth/refresh");

      if (
        axiosError.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !isRefreshRequest
      ) {
        try {
          originalRequest._retry = true;

          const newToken = await refreshToken();

          if (!(originalRequest.headers instanceof AxiosHeaders)) {
            originalRequest.headers = new AxiosHeaders(
              originalRequest.headers,
            );
          }

          originalRequest.headers.set(
            "Authorization",
            `Bearer ${newToken}`,
          );

          return await api(originalRequest);
        } catch (refreshError: unknown) {
          clearStoredToken();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    },
  );
};

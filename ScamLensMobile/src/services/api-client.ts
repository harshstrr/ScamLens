import { isAxiosError } from "axios";
import {
  initializeAuth,
  registerAuthInterceptor,
} from "./auth-interceptor";
import { api } from "./http-client";
import { hideLoader, showLoader } from "./loader-service";

registerAuthInterceptor();
void initializeAuth().catch((error: unknown) => {
  console.error("Failed to restore secure credentials", error);
});

api.interceptors.request.use(
  (config) => {
    showLoader();
    return config;
  },
  (error: unknown) => {
    hideLoader();
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    hideLoader();
    return response;
  },
  (error: unknown) => {
    hideLoader();
    console.log(error)
    if (!isAxiosError(error)) {
      return Promise.reject(error);
    }

    const responseData = error.response?.data as
      | { detail?: unknown; message?: unknown; error?: unknown }
      | undefined;
    const detail = responseData?.detail;
    const validationMessage =
      Array.isArray(detail) && detail.length > 0
        ? (detail[0] as { msg?: unknown })?.msg
        : detail;
    const message =
      (typeof responseData?.message === "string" && responseData.message) ||
      (typeof responseData?.error === "string" && responseData.error) ||
      (typeof validationMessage === "string" && validationMessage) ||
      (error.request
        ? "Network error. Please check your connection."
        : error.message || "Something went wrong.");

    return Promise.reject(new Error(message));
  },
);

export default api;
export { generateToken, refreshToken } from "./auth-service";
export { api } from "./http-client";


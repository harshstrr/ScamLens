import { exitApp } from "@logicwind/react-native-exit-app";
import { AxiosHeaders } from "axios";

import { registerAuthInterceptor } from "./auth-interceptor";
import { getStoredToken } from "./auth-service";
import { api } from "./http-client";
import { hideLoader, showLoader } from "./loader-service";

// Auth interceptor
registerAuthInterceptor();

/**
 * REQUEST INTERCEPTOR
 */
api.interceptors.request.use(
 async (config) => {

    showLoader();
    
    const token = getStoredToken();

    if (token) {
      if (!(config.headers instanceof AxiosHeaders)) {
        config.headers = new AxiosHeaders(config.headers);
      }

      config.headers.set("Authorization", `Bearer ${token}`);
    }


    //  try {
    //   addBreadcrumb({
    //     message: `Request: ${config.method?.toUpperCase()} ${config.url}`,
    //     category: "http",
    //     data: {
    //       url: config.url,
    //       method: config.method,
    //       payload: config.data,
    //     },
    //   });
    // } catch (err) {
    //   // don't break request flow
    // }

    return config;
  },
  (error) => {
    hideLoader();

    let message = "Something went wrong";

    if (error.response) {
      message =
        error.response.data?.message ||
        error.response.data?.error ||
        "Server error";
    } else if (error.request) {
      message = "Network error. Please check your connection.";
    } else {
      // Other errors
      message = error.message;
    }

    return Promise.reject(new Error(message));
  },
);

/**
 * RESPONSE INTERCEPTOR
 */
api.interceptors.response.use(
  (response) => {
    hideLoader();
    return response.data;
  },
  async (error) => {
    hideLoader();

    const response = error.response;

    let message = "Something went wrong";

    if(response?.status === 429) {

        //Backend , msg is in response.data need to fix.
        message = response.data?.message || "Too Many Request. Try Again after Sometime.";
        
        setTimeout(() => {
          exitApp();
        }, 3000)

        return Promise.reject(new Error(message));
      }

    if (response) {
      message =
        response.data?.message || response.data?.error || "Server error";
    } else if (error.request) {
      message = "Network error. Please check your connection.";
    } else if (error.message) {
      message = error.message;
    }

    // try {
    //   captureException(error, {
    //     url: error.config?.url,
    //     method: error.config?.method,
    //     status: response?.status,
    //     requestPayload: error.config?.data ?? undefined,
    //     message,
    //   });
    // } catch {
    //   // ignore
    // }

    return Promise.reject(new Error(message));
  },
);

export default api;

export { generateToken } from "./auth-service";


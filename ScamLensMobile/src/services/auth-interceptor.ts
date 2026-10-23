import axios, { AxiosHeaders } from "axios";
import { clearStoredToken, refreshToken } from "./auth-service";
import { api } from "./http-client";

// retryApi 
export const retryApi = axios.create({
  baseURL: api.defaults.baseURL,
  timeout: api.defaults.timeout,
});

export const registerAuthInterceptor = (): void => {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {

      const originalRequest = error.config as any;
      
      if (
        (error.response?.status === 401 || error.response?.status === 403) &&
        !originalRequest?._retry
      ) {
        try {

          originalRequest._retry = true;

          const newToken = await refreshToken();

          if (!(originalRequest.headers instanceof AxiosHeaders)) {
            originalRequest.headers = new AxiosHeaders(originalRequest.headers);
          }

          originalRequest.headers.set("Authorization", `Bearer ${newToken}`);

          const resp = await retryApi(originalRequest);

          return resp;

        } catch (refreshError) {
          clearStoredToken();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    },
  );
};
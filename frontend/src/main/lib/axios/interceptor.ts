import { type AxiosInstance } from "axios";

// Helper utilities to retrieve tokens safely
const getAccessToken = () => typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
const getRoleAccess = () => typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";

export const addBasePrivateInterceptors = (instance: AxiosInstance) => {
  instance.interceptors.request.use((config) => {
    const accessToken = getAccessToken();
    const roleAccess = getRoleAccess();

    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    if (roleAccess) {
      config.headers["X-App-Role"] = roleAccess.toString();
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 403) {
        if (typeof window !== "undefined") {
          window.location.href = "/403";
        }
      }
      return Promise.reject(error);
    }
  );
};
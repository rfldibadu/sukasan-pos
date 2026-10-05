import { type AxiosInstance } from "axios";
import { getSession } from "next-auth/react";

export const addBasePrivateInterceptors = (instance: AxiosInstance) => {
  instance.interceptors.request.use(
    async (config) => {
      if (typeof window !== "undefined") {
        // Retrieve session dynamically from NextAuth
        const session = await getSession();

        if (session?.access_token) {
          config.headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        if (session?.user?.role) {
          config.headers["X-App-Role"] = session.user.role;
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

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
import { type AxiosInstance } from "axios";
import type { Session } from "next-auth";
import { getSession } from "next-auth/react";

const SESSION_CACHE_TTL_MS = 60_000;
let cachedSession: Session | null = null;
let cachedSessionTimestamp = 0;
let inflightSessionPromise: Promise<Session | null> | null = null;

async function getCachedSession(): Promise<Session | null> {
  const now = Date.now();
  if (cachedSession && now - cachedSessionTimestamp < SESSION_CACHE_TTL_MS) {
    return cachedSession;
  }
  if (inflightSessionPromise) {
    return inflightSessionPromise;
  }
  inflightSessionPromise = getSession()
    .then((session) => {
      cachedSession = session;
      cachedSessionTimestamp = Date.now();
      return session;
    })
    .finally(() => {
      inflightSessionPromise = null;
    });
  return inflightSessionPromise;
}

export const addBasePrivateInterceptors = (instance: AxiosInstance) => {
  instance.interceptors.request.use(
    async (config) => {
      if (typeof window !== "undefined") {
        const session = await getCachedSession();

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
      if (error.response?.status === 401) {
        cachedSession = null;
        cachedSessionTimestamp = 0;
      }
      if (error.response?.status === 403) {
        if (typeof window !== "undefined") {
          window.location.href = "/403";
        }
      }
      return Promise.reject(error);
    }
  );
};

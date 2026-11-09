import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { axiosHttpPrivate } from "./instance";

export type GetRequest = AxiosRequestConfig | null;

interface SWRReturn<Data, Error>
  extends Pick<
    SWRResponse<AxiosResponse<Data>, AxiosError<Error>>,
    "isValidating" | "error" | "mutate" | "isLoading"
  > {
  data: AxiosResponse<Data> | undefined;
}

export interface SWRConfig<Data = unknown, Error = unknown>
  extends Omit<
    SWRConfiguration<AxiosResponse<Data>, AxiosError<Error>>,
    "fallbackData"
  > {
  fallbackData?: Data;
}

const DEFAULT_SWR_CONFIG: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  shouldRetryOnError: false,
  dedupingInterval: 60_000, // 60s default deduplication window
  focusThrottleInterval: 300_000, // 5m throttle if focus revalidation is enabled
  refreshInterval: 0,
};

/**
 * Custom SWR hook wrapping private Axios requests
 */
export function useSWRPrivateRequest<Data = unknown, Error = unknown>(
  request: GetRequest,
  { fallbackData, ...config }: SWRConfig<Data, Error> = {}
): SWRReturn<Data, Error> {
  // Use a deterministic string key so inline `{ url, method }` objects
  // share the exact same cache entry across components and re-renders.
  const swrKey =
    request && request.url
      ? `${(request.method || "GET").toUpperCase()}:${request.url}`
      : null;

  const fetcher = async () => {
    if (!request) {
      throw new Error("Request config is required");
    }
    return await axiosHttpPrivate.request<Data>(request);
  };

  const { data, error, isValidating, isLoading, mutate, ...rest } = useSWR<
    AxiosResponse<Data>,
    AxiosError<Error>
  >(swrKey, fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
    ...(fallbackData && {
      fallbackData: {
        data: fallbackData,
        status: 200,
        statusText: "OK",
        headers: {},
        config: request || {},
      } as AxiosResponse<Data>,
    }),
  });

  return {
    data,
    error,
    isValidating,
    isLoading,
    mutate,
    ...rest,
  };
}

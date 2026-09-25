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
  extends Omit<SWRConfiguration<AxiosResponse<Data>, AxiosError<Error>>, "fallbackData"> {
  fallbackData?: Data;
}

/**
 * Custom SWR hook wrapping private Axios requests
 */
export function useSWRPrivateRequest<Data = unknown, Error = unknown>(
  request: GetRequest,
  { fallbackData, ...config }: SWRConfig<Data, Error> = {}
): SWRReturn<Data, Error> {
  const fetcher = async (req: AxiosRequestConfig) => {
    return await axiosHttpPrivate.request<Data>(req);
  };

  const { data, error, isValidating, isLoading, mutate, ...rest } = useSWR<
    AxiosResponse<Data>,
    AxiosError<Error>
  >(request, fetcher, {
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
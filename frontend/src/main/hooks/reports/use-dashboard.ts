import { useSWRPrivateRequest } from "@/main/lib/axios";
import { DashboardReport } from "@/main/usecases/dashboard";

export function useDashboard(startDate?: string, endDate?: string) {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("start_date", startDate);
  if (endDate) queryParams.append("end_date", endDate);

  const queryString = queryParams.toString();
  const url = `/reports/dashboard${queryString ? `?${queryString}` : ""}`;

  const { data, isValidating, mutate, error } = useSWRPrivateRequest<DashboardReport>(
    { url, method: "GET" },
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    }
  );

  return {
    report: data?.data || null,
    isLoading: !data && !error,
    isValidating,
    error,
    refresh: mutate,
  };
}
import { useSWRPrivateRequest } from "@/main/lib/axios";
import { DashboardPeriod, DashboardReport } from "@/main/usecases/dashboard";

export function useDashboard(
  period: DashboardPeriod = "today",
  refDate?: string,
  startDate?: string,
  endDate?: string
) {
  const queryParams = new URLSearchParams();
  queryParams.append("period", period);
  if (refDate) queryParams.append("ref_date", refDate);
  if (startDate) queryParams.append("start_date", startDate);
  if (endDate) queryParams.append("end_date", endDate);

  const queryString = queryParams.toString();
  const url = `/reports/dashboard${queryString ? `?${queryString}` : ""}`;

  const { data, isValidating, mutate, error } =
    useSWRPrivateRequest<DashboardReport>(
      { url, method: "GET" },
      {
        dedupingInterval: 120_000,
        shouldRetryOnError: false,
        revalidateOnFocus: false,
        keepPreviousData: true,
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

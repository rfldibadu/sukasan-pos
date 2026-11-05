import { z } from "zod";
import {
  TopSellingProductSchema,
  PaymentMethodSchema,
  HourlySalesBucketSchema,
  SalesTrendBucketSchema,
  DashboardPeriodSchema,
  TopSellingProductsResponseSchema,
  DashboardReportSchema,
} from "./schema";

export type TopSellingProduct = z.infer<typeof TopSellingProductSchema>;
export type PaymentMethodBreakdown = z.infer<typeof PaymentMethodSchema>;
export type HourlySalesBucket = z.infer<typeof HourlySalesBucketSchema>;
export type SalesTrendBucket = z.infer<typeof SalesTrendBucketSchema>;
export type DashboardPeriod = z.infer<typeof DashboardPeriodSchema>;
export type TopSellingProductsResponse = z.infer<typeof TopSellingProductsResponseSchema>;
export type DashboardReport = z.infer<typeof DashboardReportSchema>;

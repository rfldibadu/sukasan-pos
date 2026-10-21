import { z } from "zod";
import {
  TopSellingProductSchema,
  PaymentMethodSchema,
  TopSellingProductsResponseSchema,
  DashboardReportSchema,
} from "./schema";

export type TopSellingProduct = z.infer<typeof TopSellingProductSchema>;
export type PaymentMethodBreakdown = z.infer<typeof PaymentMethodSchema>;
export type TopSellingProductsResponse = z.infer<typeof TopSellingProductsResponseSchema>;
export type DashboardReport = z.infer<typeof DashboardReportSchema>;
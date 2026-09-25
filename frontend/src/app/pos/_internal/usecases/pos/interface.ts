import { z } from "zod";
import {
  POSProductSchema,
  POSCartItemSchema,
  POSProductListResponseSchema,
  POSFilterListSchema,
  POSCreateOrderSubmitSchema,
  POSCreateOrderResponseSchema,
} from "./schema";

export type POSProduct = z.infer<typeof POSProductSchema>;
export type POSCartItem = z.infer<typeof POSCartItemSchema>;
export type POSProductListResponse = z.infer<typeof POSProductListResponseSchema>;
export type POSFilterList = z.infer<typeof POSFilterListSchema>;
export type POSCreateOrderSubmitValues = z.infer<typeof POSCreateOrderSubmitSchema>;
export type POSCreateOrderResponse = z.infer<typeof POSCreateOrderResponseSchema>;
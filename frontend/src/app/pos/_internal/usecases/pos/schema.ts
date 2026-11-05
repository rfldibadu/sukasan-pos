import { z } from "zod";

export const POSProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number(),
  is_available: z.boolean(),
  item_type: z.enum(["MAIN", "CONSIGNMENT", "ADD_ON"]).or(z.string()).optional(),
  stock_quantity: z.number().nullable().optional(),
  consignment_fee: z.number().nullable().optional(),
  vendor_name: z.string().nullable().optional(),
});

export const POSCartItemSchema = z.object({
  product: POSProductSchema,
  quantity: z.number().min(1),
  itemNotes: z.string().optional(),
  selectedAddOns: z.array(POSProductSchema).optional(),
});

export const POSProductListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(POSProductSchema),
});

export const POSFilterListSchema = z.object({
  category: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
});

export const POSCreateOrderItemSchema = z.object({
  product_id: z.string(),
  quantity: z.number().min(1),
  addon_ids: z.array(z.string()).optional(),
  item_notes: z.string().nullable().optional(),
});

export const POSCreateOrderSubmitSchema = z.object({
  customer_name: z.string().nullable().optional(),
  table_number: z.string().nullable().optional(),
  order_type: z.enum(["takeaway", "dine_in", "TAKEAWAY", "DINE_IN"]),
  payment_status: z.enum(["paid", "unpaid", "PAID", "UNPAID"]).optional(),
  payment_method: z.enum(["qris", "cash", "QRIS", "CASH"]).nullable().optional(),
  discount_amount: z.number().default(0),
  cash_amount_received: z.number().nullable().optional(),
  items: z.array(POSCreateOrderItemSchema),
});

export const POSCreateOrderResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  data: z.record(z.string(), z.unknown()),
});

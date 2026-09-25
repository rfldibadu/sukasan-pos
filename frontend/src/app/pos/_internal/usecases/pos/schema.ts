import { z } from "zod";

export const POSProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number(),
  is_available: z.boolean(),
});

export const POSCartItemSchema = z.object({
  product: POSProductSchema,
  quantity: z.number().min(1),
  itemNotes: z.string().optional(),
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

export const POSCreateOrderSubmitSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  order_type: z.enum(["takeaway", "dine_in"]),
  payment_method: z.enum(["qris", "cash"]),
  discount_amount: z.number().default(0),
  cash_amount_received: z.number().nonnegative(),
  items: z.array(
    z.object({
      product_id: z.string(),
      quantity: z.number().min(1),
      item_notes: z.string().optional(),
    })
  ),
});

export const POSCreateOrderResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    order_id: z.string(),
  }),
});
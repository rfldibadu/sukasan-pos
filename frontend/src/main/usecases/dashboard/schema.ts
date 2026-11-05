import { z } from "zod";

export const TopSellingProductSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity_sold: z.number(),
  total_revenue: z.number(),
  unit_price: z.number().nullable().optional(),
  item_type: z.string().nullable().optional(),
  main_category: z.string().nullable().optional(),
  vendor_name: z.string().nullable().optional(),
});

export const PaymentMethodSchema = z.object({
  payment_method: z.string(),
  total_amount: z.number(),
  order_count: z.number(),
});

export const HourlySalesBucketSchema = z.object({
  hour: z.number(),
  hour_label: z.string(),
  gross_sales: z.number(),
  order_count: z.number(),
  is_peak: z.boolean().optional(),
});

export const TopSellingProductsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(TopSellingProductSchema),
});

export const DashboardReportSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  total_orders_count: z.number(),
  completed_orders_count: z.number(),
  paid_orders_count: z.number().optional().default(0),
  open_bills_count: z.number().optional().default(0),
  open_bills_amount: z.number().optional().default(0),
  voided_orders_count: z.number(),
  gross_sales: z.number(),
  total_discounts: z.number(),
  consignment_sales_total: z.number(),
  consignment_payable_to_vendors: z.number(),
  consignment_fees_earned: z.number(),
  net_cafe_revenue: z.number(),
  raw_stock_expenses: z.number().optional().default(0),
  operational_expenses: z.number(),
  total_cash_in: z.number().optional().default(0),
  total_cash_out: z.number().optional().default(0),
  net_cashflow: z.number().optional().default(0),
  net_profit: z.number(),
  payment_breakdown: z.array(PaymentMethodSchema),
  top_selling_products: z.array(TopSellingProductSchema),
  hourly_sales: z.array(HourlySalesBucketSchema).optional().default([]),
});

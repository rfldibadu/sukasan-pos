import { z } from "zod";

export const TopSellingProductSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity_sold: z.number(),
  total_revenue: z.number(),
});

export const PaymentMethodSchema = z.object({
  payment_method: z.string(),
  total_amount: z.number(),
  order_count: z.number(),
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
  voided_orders_count: z.number(),
  gross_sales: z.number(),
  total_discounts: z.number(),
  consignment_sales_total: z.number(),
  consignment_payable_to_vendors: z.number(),
  consignment_fees_earned: z.number(),
  net_cafe_revenue: z.number(),
  operational_expenses: z.number(),
  net_profit: z.number(),
  payment_breakdown: z.array(PaymentMethodSchema),
  top_selling_products: z.array(TopSellingProductSchema),
});
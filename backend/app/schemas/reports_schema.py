from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class TopSellingProduct(BaseModel):
    product_id: str
    product_name: str
    quantity_sold: int
    total_revenue: float

class PaymentMethodBreakdown(BaseModel):
    payment_method: str
    total_amount: float
    order_count: int

class DashboardReportResponse(BaseModel):
    start_date: datetime
    end_date: datetime
    total_orders_count: int
    completed_orders_count: int
    voided_orders_count: int
    
    # Financial Overview
    gross_sales: float
    total_discounts: float
    consignment_sales_total: float
    consignment_payable_to_vendors: float
    consignment_fees_earned: float
    net_cafe_revenue: float
    operational_expenses: float
    net_profit: float
    
    # Analytics
    payment_breakdown: List[PaymentMethodBreakdown]
    top_selling_products: List[TopSellingProduct]
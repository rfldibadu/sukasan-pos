from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel


class TopSellingProduct(BaseModel):
    product_id: str
    product_name: str
    quantity_sold: int
    total_revenue: float
    unit_price: Optional[float] = None
    item_type: Optional[str] = None
    main_category: Optional[str] = None
    vendor_name: Optional[str] = None


class PaymentMethodBreakdown(BaseModel):
    payment_method: str
    total_amount: float
    order_count: int


class HourlySalesBucket(BaseModel):
    hour: int
    hour_label: str  # e.g. "11:00"
    gross_sales: float
    order_count: int
    is_peak: bool = False


class SalesTrendBucket(BaseModel):
    label: str
    sublabel: Optional[str] = None
    gross_sales: float = 0.0
    cash_out: float = 0.0
    net_cashflow: float = 0.0
    order_count: int = 0
    is_peak: bool = False


class DashboardReportResponse(BaseModel):
    period: Literal["today", "week", "month", "year"] = "today"
    period_label: str = ""
    timezone: str = "WITA (UTC+8)"
    start_date: datetime
    end_date: datetime
    total_orders_count: int
    completed_orders_count: int
    paid_orders_count: int = 0
    open_bills_count: int = 0
    open_bills_amount: float = 0.0
    voided_orders_count: int

    # Financial & Cashflow Overview
    gross_sales: float
    total_discounts: float
    consignment_sales_total: float
    consignment_payable_to_vendors: float
    consignment_fees_earned: float
    net_cafe_revenue: float
    raw_stock_expenses: float = 0.0
    operational_expenses: float
    total_cash_in: float = 0.0
    total_cash_out: float = 0.0
    net_cashflow: float = 0.0
    net_profit: float

    # Analytics
    payment_breakdown: List[PaymentMethodBreakdown]
    top_selling_products: List[TopSellingProduct]
    hourly_sales: List[HourlySalesBucket] = []
    trend_buckets: List[SalesTrendBucket] = []


# ==========================================
# GOOGLE SHEET CASHFLOW SCHEMAS
# ==========================================
class CashflowLedgerEntry(BaseModel):
    """Matches a row in 'Input Transaksi/Hari'"""
    id: str
    date: datetime
    flow_type: Literal["Pemasukan", "Pengeluaran"]
    source_type: Literal["order", "raw_stock_purchase", "operational_cost"]
    title: str
    category: Optional[str] = None
    quantity: float = 1.0
    unit_amount: float
    total_amount: float
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    receipt_image_url: Optional[str] = None


class DailyCashflowItem(BaseModel):
    """Matches a row in 'Rekap Harian'"""
    date: str  # YYYY-MM-DD
    total_masuk: float
    raw_stock_keluar: float
    operational_keluar: float
    total_keluar: float
    net_cashflow: float


class MonthlyCashflowItem(BaseModel):
    """Matches a row in 'Rekap Bulanan'"""
    month: int
    year: int
    month_label: str  # e.g. "Juni 2026"
    total_masuk: float
    raw_stock_keluar: float
    operational_keluar: float
    total_keluar: float
    net_cashflow: float

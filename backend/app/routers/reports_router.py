from datetime import datetime, time, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.users import User
from app.core.security import require_manager
from app.schemas.reports_schema import (
    DashboardReportResponse,
    DailyCashflowItem,
    MonthlyCashflowItem,
    CashflowLedgerEntry,
)
from app.services.reports_service import (
    get_dashboard_report,
    get_daily_cashflow_report,
    get_monthly_cashflow_report,
    get_cashflow_ledger,
)

router = APIRouter(prefix="/reports", tags=["Financial & Cashflow Reports"])


@router.get("/dashboard", response_model=DashboardReportResponse)
def get_financial_dashboard(
    start_date: Optional[str] = Query(None, description="Format: YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Format: YYYY-MM-DD"),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    today = datetime.now(timezone.utc).date()

    parsed_start = (
        datetime.combine(datetime.strptime(start_date, "%Y-%m-%d").date(), time.min)
        if start_date
        else datetime.combine(today, time.min)
    )
    parsed_end = (
        datetime.combine(datetime.strptime(end_date, "%Y-%m-%d").date(), time.max)
        if end_date
        else datetime.combine(today, time.max)
    )

    return get_dashboard_report(db, parsed_start, parsed_end)


@router.get("/cashflow/daily", response_model=List[DailyCashflowItem])
def get_daily_cashflow(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2024),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    return get_daily_cashflow_report(db, target_month, target_year)


@router.get("/cashflow/monthly", response_model=List[MonthlyCashflowItem])
def get_monthly_cashflow(
    year: Optional[int] = Query(None, ge=2024),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    target_year = year or datetime.now(timezone.utc).year
    return get_monthly_cashflow_report(db, target_year)


@router.get("/cashflow/ledger", response_model=List[CashflowLedgerEntry])
def get_transactions_ledger(
    start_date: Optional[str] = Query(None, description="Format: YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Format: YYYY-MM-DD"),
    limit: int = Query(200, ge=1, le=1000),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    today = datetime.now(timezone.utc).date()
    parsed_start = (
        datetime.combine(datetime.strptime(start_date, "%Y-%m-%d").date(), time.min)
        if start_date
        else datetime.combine(today.replace(day=1), time.min)
    )
    parsed_end = (
        datetime.combine(datetime.strptime(end_date, "%Y-%m-%d").date(), time.max)
        if end_date
        else datetime.combine(today, time.max)
    )
    return get_cashflow_ledger(db, parsed_start, parsed_end, limit=limit)

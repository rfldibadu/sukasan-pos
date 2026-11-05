from datetime import datetime, time
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.timezone import WITA_TZ, get_wita_period_bounds, now_wita, today_wita
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
    period: Literal["today", "week", "month", "year"] = Query(
        "today",
        description="Cashflow & dashboard period in WITA (UTC+8): today (default), week, month, or year",
    ),
    ref_date: Optional[str] = Query(
        None,
        description="Optional reference date in YYYY-MM-DD (WITA) for inspecting past days/weeks/months/years",
    ),
    start_date: Optional[str] = Query(None, description="Custom start date override: YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Custom end date override: YYYY-MM-DD"),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    target_ref = (
        datetime.strptime(ref_date, "%Y-%m-%d").date()
        if ref_date
        else today_wita()
    )

    if start_date and end_date:
        s_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        e_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        parsed_start = datetime.combine(s_date, time.min, tzinfo=WITA_TZ)
        parsed_end = datetime.combine(e_date, time.max, tzinfo=WITA_TZ)
        period_label = f"{start_date} – {end_date} (WITA)"
    else:
        parsed_start, parsed_end, period_label = get_wita_period_bounds(period, target_ref)

    return get_dashboard_report(
        db,
        parsed_start,
        parsed_end,
        period=period,
        period_label=period_label,
    )


@router.get("/cashflow/daily", response_model=List[DailyCashflowItem])
def get_daily_cashflow(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2024),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    now = now_wita()
    target_month = month or now.month
    target_year = year or now.year
    return get_daily_cashflow_report(db, target_month, target_year)


@router.get("/cashflow/monthly", response_model=List[MonthlyCashflowItem])
def get_monthly_cashflow(
    year: Optional[int] = Query(None, ge=2024),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    target_year = year or now_wita().year
    return get_monthly_cashflow_report(db, target_year)


@router.get("/cashflow/ledger", response_model=List[CashflowLedgerEntry])
def get_transactions_ledger(
    start_date: Optional[str] = Query(None, description="Format: YYYY-MM-DD (WITA)"),
    end_date: Optional[str] = Query(None, description="Format: YYYY-MM-DD (WITA)"),
    limit: int = Query(300, ge=1, le=2000),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    today = today_wita()
    parsed_start = (
        datetime.combine(datetime.strptime(start_date, "%Y-%m-%d").date(), time.min, tzinfo=WITA_TZ)
        if start_date
        else datetime.combine(today.replace(day=1), time.min, tzinfo=WITA_TZ)
    )
    parsed_end = (
        datetime.combine(datetime.strptime(end_date, "%Y-%m-%d").date(), time.max, tzinfo=WITA_TZ)
        if end_date
        else datetime.combine(today, time.max, tzinfo=WITA_TZ)
    )
    return get_cashflow_ledger(db, parsed_start, parsed_end, limit=limit)

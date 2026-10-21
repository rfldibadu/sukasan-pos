from datetime import datetime, time, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.users import User, UserRole
from app.core.security import get_current_user
from app.schemas.reports_schema import DashboardReportResponse
from app.services.reports_service import get_dashboard_report

router = APIRouter(prefix="/reports", tags=["Financial Reports"])

@router.get("/dashboard", response_model=DashboardReportResponse)
def get_financial_dashboard(
    start_date: Optional[str] = Query(None, description="Format: YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Format: YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.now(timezone.utc).date()
    
    parsed_start = datetime.combine(datetime.strptime(start_date, "%Y-%m-%d").date(), time.min) if start_date else datetime.combine(today, time.min)
    parsed_end = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d").date(), time.max) if end_date else datetime.combine(today, time.max)

    return get_dashboard_report(db, parsed_start, parsed_end)
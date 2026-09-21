from datetime import datetime, time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.users import User, UserRole
from app.core.security import get_current_user
from app.schemas.reports_schema import DashboardReportResponse
from app.services.reports_service import get_dashboard_report

router = APIRouter(prefix="/reports", tags=["Financial Reports"])

@router.get("/dashboard", response_model=DashboardReportResponse)
def get_financial_dashboard(
    start_date: Optional[str] = Query(None, description="Format: YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Format: YYYY-MM-DD"),
    current_user: User = Depends(get_current_user)
):
    # Manager access guard
    if current_user.role != UserRole.MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Managers"
        )

    # Default to current day if no date provided
    today = datetime.utcnow().date()
    
    parsed_start = datetime.combine(datetime.strptime(start_date, "%Y-%m-%d").date(), time.min) if start_date else datetime.combine(today, time.min)
    parsed_end = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d").date(), time.max) if end_date else datetime.combine(today, time.max)

    return get_dashboard_report(parsed_start, parsed_end)
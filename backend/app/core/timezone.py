import calendar
from datetime import date, datetime, time, timedelta, timezone
from typing import Literal, Optional, Tuple

WITA_TZ = timezone(timedelta(hours=8), name="WITA")

INDONESIAN_MONTHS = {
    1: "Januari",
    2: "Februari",
    3: "Maret",
    4: "April",
    5: "Mei",
    6: "Juni",
    7: "Juli",
    8: "Agustus",
    9: "September",
    10: "Oktober",
    11: "November",
    12: "Desember",
}

INDONESIAN_SHORT_MONTHS = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "Mei",
    6: "Jun",
    7: "Jul",
    8: "Agu",
    9: "Sep",
    10: "Okt",
    11: "Nov",
    12: "Des",
}

INDONESIAN_DAYS = {
    0: "Sen",
    1: "Sel",
    2: "Rab",
    3: "Kam",
    4: "Jum",
    5: "Sab",
    6: "Min",
}


def now_wita() -> datetime:
    """Return the current timezone-aware datetime in WITA (UTC+8)."""
    return datetime.now(WITA_TZ)


def today_wita() -> date:
    """Return the current calendar date in WITA (UTC+8)."""
    return now_wita().date()


def to_wita(dt: Optional[datetime]) -> Optional[datetime]:
    """Convert any datetime (naive or aware) to WITA (UTC+8)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=WITA_TZ)
    return dt.astimezone(WITA_TZ)


def get_wita_day_bounds(target_date: date) -> Tuple[datetime, datetime]:
    """Return (00:00:00+08:00, 23:59:59.999999+08:00) for a given calendar date in WITA."""
    start = datetime.combine(target_date, time.min, tzinfo=WITA_TZ)
    end = datetime.combine(target_date, time.max, tzinfo=WITA_TZ)
    return start, end


def get_wita_period_bounds(
    period: Literal["today", "week", "month", "year"],
    ref_date: Optional[date] = None,
) -> Tuple[datetime, datetime, str]:
    """
    Calculate (start_datetime_wita, end_datetime_wita, human_label) for:
      - 'today': single day in WITA
      - 'week': Monday..Sunday containing ref_date in WITA
      - 'month': 1st..last day of ref_date's month in WITA
      - 'year': Jan 1..Dec 31 of ref_date's year in WITA
    """
    target = ref_date or today_wita()

    if period == "today":
        start, end = get_wita_day_bounds(target)
        is_today = target == today_wita()
        prefix = "Hari Ini • " if is_today else ""
        label = f"{prefix}{target.day:02d} {INDONESIAN_SHORT_MONTHS[target.month]} {target.year} (WITA)"
        return start, end, label

    if period == "week":
        monday = target - timedelta(days=target.weekday())
        sunday = monday + timedelta(days=6)
        start = datetime.combine(monday, time.min, tzinfo=WITA_TZ)
        end = datetime.combine(sunday, time.max, tzinfo=WITA_TZ)
        if monday.month == sunday.month:
            label = f"{monday.day:02d}–{sunday.day:02d} {INDONESIAN_SHORT_MONTHS[monday.month]} {monday.year} (WITA)"
        else:
            label = (
                f"{monday.day:02d} {INDONESIAN_SHORT_MONTHS[monday.month]} – "
                f"{sunday.day:02d} {INDONESIAN_SHORT_MONTHS[sunday.month]} {sunday.year} (WITA)"
            )
        return start, end, label

    if period == "month":
        first_day = target.replace(day=1)
        last_day_num = calendar.monthrange(target.year, target.month)[1]
        last_day = target.replace(day=last_day_num)
        start = datetime.combine(first_day, time.min, tzinfo=WITA_TZ)
        end = datetime.combine(last_day, time.max, tzinfo=WITA_TZ)
        label = f"{INDONESIAN_MONTHS[target.month]} {target.year} (WITA)"
        return start, end, label

    # period == "year"
    first_day = date(target.year, 1, 1)
    last_day = date(target.year, 12, 31)
    start = datetime.combine(first_day, time.min, tzinfo=WITA_TZ)
    end = datetime.combine(last_day, time.max, tzinfo=WITA_TZ)
    label = f"Tahun {target.year} (WITA)"
    return start, end, label

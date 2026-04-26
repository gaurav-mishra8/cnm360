import calendar as cal
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.payroll import Employee, PayrollRun
from app.services.accounting import get_profit_loss, get_journal_entries

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _prev_month(year: int, month: int, n: int):
    month -= n
    while month <= 0:
        month += 12
        year -= 1
    return year, month


@router.get("/summary")
def summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    fy_start = date(today.year if today.month >= 4 else today.year - 1, 4, 1)
    month_start = date(today.year, today.month, 1)

    pl_fy = get_profit_loss(db, current_user.org_id, fy_start, today)
    pl_month = get_profit_loss(db, current_user.org_id, month_start, today)

    employee_count = db.query(Employee).filter(
        Employee.org_id == current_user.org_id, Employee.status == "active"
    ).count()

    recent_runs = db.query(PayrollRun).filter(
        PayrollRun.org_id == current_user.org_id
    ).order_by(PayrollRun.year.desc(), PayrollRun.month.desc()).limit(3).all()

    recent_entries = get_journal_entries(db, current_user.org_id, limit=5)

    # Monthly chart — last 6 months
    monthly_chart = []
    for i in range(5, -1, -1):
        y, m = _prev_month(today.year, today.month, i)
        from_d = date(y, m, 1)
        to_d = date(y, m, cal.monthrange(y, m)[1])
        pl = get_profit_loss(db, current_user.org_id, from_d, to_d)
        monthly_chart.append({
            "month": MONTHS[m - 1],
            "revenue": float(pl.total_revenue),
            "expenses": float(pl.total_expenses),
            "profit": float(pl.net_profit),
        })

    # Expense breakdown by category (top 5)
    expense_breakdown = []
    for row in pl_fy.expenses:
        expense_breakdown.append({"name": row.name, "value": float(row.amount)})
    expense_breakdown = sorted(expense_breakdown, key=lambda x: x["value"], reverse=True)[:8]

    return {
        "fy": {
            "revenue": pl_fy.total_revenue,
            "expenses": pl_fy.total_expenses,
            "net_profit": pl_fy.net_profit,
        },
        "month": {
            "revenue": pl_month.total_revenue,
            "expenses": pl_month.total_expenses,
            "net_profit": pl_month.net_profit,
            "name": MONTHS[today.month - 1],
        },
        "employee_count": employee_count,
        "recent_payroll_runs": [
            {"id": r.id, "month": r.month, "year": r.year, "status": r.status} for r in recent_runs
        ],
        "recent_journal_entries": [
            {"id": e.id, "entry_number": e.entry_number, "date": str(e.date),
             "description": e.description, "status": e.status} for e in recent_entries
        ],
        "compliance": _compliance_items(today),
        "monthly_chart": monthly_chart,
        "expense_breakdown": expense_breakdown,
    }


def _compliance_items(today: date) -> list[dict]:
    items = []
    y, m = today.year, today.month

    next_m = m + 1 if m < 12 else 1
    next_y = y if m < 12 else y + 1
    gst_due = date(next_y, next_m, 20)
    items.append({"name": f"GST GSTR-3B ({MONTHS[m - 1]})", "due": str(gst_due),
                  "days_left": (gst_due - today).days, "type": "gst"})

    tds_quarters = [
        (4, 6, 7, 31, "Q1"), (7, 9, 10, 31, "Q2"), (10, 12, 1, 31, "Q3"), (1, 3, 5, 31, "Q4")
    ]
    for q_start, q_end, due_m, due_d, label in tds_quarters:
        due_y = y if due_m >= 4 else y + 1
        try:
            due = date(due_y, due_m, due_d)
        except ValueError:
            due = date(due_y, due_m, cal.monthrange(due_y, due_m)[1])
        if due >= today:
            items.append({"name": f"TDS Return ({label})", "due": str(due),
                          "days_left": (due - today).days, "type": "tds"})
            break

    pf_due = date(next_y, next_m, 15)
    items.append({"name": f"PF/ESIC Payment ({MONTHS[m - 1]})", "due": str(pf_due),
                  "days_left": (pf_due - today).days, "type": "pf"})

    return sorted(items, key=lambda x: x["days_left"])

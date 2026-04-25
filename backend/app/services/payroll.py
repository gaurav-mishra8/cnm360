import calendar
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.payroll import Employee, PayrollRun, PayrollEntry
from app.schemas.payroll import EmployeeCreate, EmployeeUpdate, PayrollRunCreate, PayrollProcessRequest


def _professional_tax(monthly_gross: Decimal) -> Decimal:
    """Maharashtra professional tax slab."""
    if monthly_gross <= 7500:
        return Decimal("0")
    elif monthly_gross <= 10000:
        return Decimal("175")
    return Decimal("200")


def _calculate_entry(employee: Employee, days_in_month: int, days_worked: int,
                     other_allowances: Decimal, other_deductions: Decimal, tds: Decimal) -> dict:
    ratio = Decimal(days_worked) / Decimal(days_in_month)

    basic = (employee.basic_salary * ratio).quantize(Decimal("0.01"))
    hra = (employee.hra * ratio).quantize(Decimal("0.01"))
    da = (employee.da * ratio).quantize(Decimal("0.01"))
    special = (employee.special_allowance * ratio).quantize(Decimal("0.01"))
    gross = basic + hra + da + special + other_allowances

    pf_employee = (basic * Decimal("0.12")).quantize(Decimal("0.01")) if employee.is_pf_applicable else Decimal("0")
    pf_employer = (basic * Decimal("0.12")).quantize(Decimal("0.01")) if employee.is_pf_applicable else Decimal("0")

    monthly_gross = employee.basic_salary + employee.hra + employee.da + employee.special_allowance
    esic_applicable = employee.is_esic_applicable and monthly_gross <= 21000
    esic_employee = (gross * Decimal("0.0075")).quantize(Decimal("0.01")) if esic_applicable else Decimal("0")
    esic_employer = (gross * Decimal("0.0325")).quantize(Decimal("0.01")) if esic_applicable else Decimal("0")

    pt = _professional_tax(gross)
    total_deductions = pf_employee + esic_employee + pt + tds + other_deductions
    net_salary = gross - total_deductions

    return dict(
        days_in_month=days_in_month, days_worked=days_worked,
        loss_of_pay_days=days_in_month - days_worked,
        basic_salary=basic, hra=hra, da=da, special_allowance=special,
        other_allowances=other_allowances, gross_salary=gross,
        pf_employee=pf_employee, pf_employer=pf_employer,
        esic_employee=esic_employee, esic_employer=esic_employer,
        professional_tax=pt, tds=tds, other_deductions=other_deductions,
        total_deductions=total_deductions, net_salary=net_salary,
    )


# --- Employee ---

def get_employees(db: Session, org_id: str) -> list[Employee]:
    return db.query(Employee).filter(Employee.org_id == org_id).order_by(Employee.employee_code).all()


def get_employee(db: Session, org_id: str, employee_id: str) -> Employee | None:
    return db.query(Employee).filter(Employee.id == employee_id, Employee.org_id == org_id).first()


def create_employee(db: Session, org_id: str, data: EmployeeCreate) -> Employee:
    emp = Employee(org_id=org_id, **data.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


def update_employee(db: Session, emp: Employee, data: EmployeeUpdate) -> Employee:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(emp, k, v)
    db.commit()
    db.refresh(emp)
    return emp


# --- Payroll Runs ---

def get_payroll_runs(db: Session, org_id: str) -> list[PayrollRun]:
    return db.query(PayrollRun).filter(PayrollRun.org_id == org_id).order_by(
        PayrollRun.year.desc(), PayrollRun.month.desc()
    ).all()


def get_payroll_run(db: Session, org_id: str, run_id: str) -> PayrollRun | None:
    return db.query(PayrollRun).filter(PayrollRun.id == run_id, PayrollRun.org_id == org_id).first()


def create_payroll_run(db: Session, org_id: str, user_id: str, data: PayrollRunCreate) -> PayrollRun:
    run = PayrollRun(org_id=org_id, month=data.month, year=data.year, notes=data.notes, created_by=user_id)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def process_payroll_run(db: Session, run: PayrollRun, org_id: str, req: PayrollProcessRequest) -> PayrollRun:
    # Clear existing entries
    db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id == run.id).delete()

    days_in_month = calendar.monthrange(run.year, run.month)[1]
    employees = db.query(Employee).filter(Employee.org_id == org_id, Employee.status == "active").all()

    override_map = {o.employee_id: o for o in req.overrides}

    for emp in employees:
        override = override_map.get(emp.id)
        days_worked = override.days_worked if override else days_in_month
        other_allowances = override.other_allowances if override else Decimal("0")
        other_deductions = override.other_deductions if override else Decimal("0")
        tds = override.tds if override else Decimal("0")

        calc = _calculate_entry(emp, days_in_month, days_worked, other_allowances, other_deductions, tds)
        entry = PayrollEntry(payroll_run_id=run.id, employee_id=emp.id, **calc)
        db.add(entry)

    run.status = "processed"
    db.commit()
    db.refresh(run)
    return run


def approve_payroll_run(db: Session, run: PayrollRun) -> PayrollRun:
    from datetime import datetime
    run.status = "approved"
    run.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(run)
    return run

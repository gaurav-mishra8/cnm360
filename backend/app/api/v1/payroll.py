from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.payroll import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    PayrollRunCreate, PayrollRunResponse, PayrollEntryResponse,
    PayrollProcessRequest,
)
from app.services import payroll as svc
from app.services.pdf import generate_payslip
from decimal import Decimal

router = APIRouter(prefix="/payroll", tags=["payroll"])


def _employee_response(emp) -> EmployeeResponse:
    gross = emp.basic_salary + emp.hra + emp.da + emp.special_allowance
    r = EmployeeResponse.model_validate(emp)
    r.gross_salary = gross
    return r


def _run_response(run) -> PayrollRunResponse:
    entries = []
    total_gross = total_net = total_employer_cost = Decimal("0")
    for e in run.entries:
        entries.append(PayrollEntryResponse(
            id=e.id,
            employee_id=e.employee_id,
            employee_code=e.employee.employee_code,
            employee_name=e.employee.full_name,
            days_in_month=e.days_in_month,
            days_worked=e.days_worked,
            loss_of_pay_days=e.loss_of_pay_days,
            basic_salary=e.basic_salary,
            hra=e.hra,
            da=e.da,
            special_allowance=e.special_allowance,
            other_allowances=e.other_allowances,
            gross_salary=e.gross_salary,
            pf_employee=e.pf_employee,
            pf_employer=e.pf_employer,
            esic_employee=e.esic_employee,
            esic_employer=e.esic_employer,
            professional_tax=e.professional_tax,
            tds=e.tds,
            other_deductions=e.other_deductions,
            total_deductions=e.total_deductions,
            net_salary=e.net_salary,
        ))
        total_gross += e.gross_salary
        total_net += e.net_salary
        total_employer_cost += e.gross_salary + e.pf_employer + e.esic_employer

    return PayrollRunResponse(
        id=run.id, month=run.month, year=run.year, status=run.status,
        notes=run.notes, created_at=run.created_at, approved_at=run.approved_at,
        entries=entries, total_gross=total_gross, total_net=total_net,
        total_employer_cost=total_employer_cost,
    )


# --- Employees ---

@router.get("/employees", response_model=list[EmployeeResponse])
def list_employees(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [_employee_response(e) for e in svc.get_employees(db, current_user.org_id)]


@router.post("/employees", response_model=EmployeeResponse, status_code=201)
def create_employee(data: EmployeeCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    emp = svc.create_employee(db, current_user.org_id, data)
    return _employee_response(emp)


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    emp = svc.get_employee(db, current_user.org_id, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found")
    return _employee_response(emp)


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(employee_id: str, data: EmployeeUpdate,
                    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    emp = svc.get_employee(db, current_user.org_id, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found")
    emp = svc.update_employee(db, emp, data)
    return _employee_response(emp)


# --- Payroll Runs ---

@router.get("/runs", response_model=list[PayrollRunResponse])
def list_runs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [_run_response(r) for r in svc.get_payroll_runs(db, current_user.org_id)]


@router.post("/runs", response_model=PayrollRunResponse, status_code=201)
def create_run(data: PayrollRunCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = svc.create_payroll_run(db, current_user.org_id, current_user.id, data)
    return _run_response(run)


@router.get("/runs/{run_id}", response_model=PayrollRunResponse)
def get_run(run_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = svc.get_payroll_run(db, current_user.org_id, run_id)
    if not run:
        raise HTTPException(404, "Payroll run not found")
    return _run_response(run)


@router.post("/runs/{run_id}/process", response_model=PayrollRunResponse)
def process_run(run_id: str, req: PayrollProcessRequest,
                current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = svc.get_payroll_run(db, current_user.org_id, run_id)
    if not run:
        raise HTTPException(404, "Payroll run not found")
    if run.status == "approved":
        raise HTTPException(400, "Cannot reprocess an approved payroll run")
    run = svc.process_payroll_run(db, run, current_user.org_id, req)
    return _run_response(run)


@router.get("/runs/{run_id}/entries/{entry_id}/payslip")
def download_payslip(run_id: str, entry_id: str,
                     current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = svc.get_payroll_run(db, current_user.org_id, run_id)
    if not run:
        raise HTTPException(404, "Payroll run not found")
    entry = next((e for e in run.entries if e.id == entry_id), None)
    if not entry:
        raise HTTPException(404, "Entry not found")
    pdf_bytes = generate_payslip(current_user.organisation.name, entry, run.month, run.year)
    filename = f"payslip-{entry.employee.employee_code}-{run.year}-{run.month:02d}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.post("/runs/{run_id}/approve", response_model=PayrollRunResponse)
def approve_run(run_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = svc.get_payroll_run(db, current_user.org_id, run_id)
    if not run:
        raise HTTPException(404, "Payroll run not found")
    if run.status != "processed":
        raise HTTPException(400, "Only processed payroll runs can be approved")
    run = svc.approve_payroll_run(db, run)
    return _run_response(run)

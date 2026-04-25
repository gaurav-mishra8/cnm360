from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal


class EmployeeCreate(BaseModel):
    employee_code: str
    full_name: str
    email: str
    department: str
    designation: str
    date_of_joining: date
    pan_number: str | None = None
    uan_number: str | None = None
    esic_number: str | None = None
    bank_account: str | None = None
    bank_ifsc: str | None = None
    basic_salary: Decimal
    hra: Decimal = Decimal("0")
    da: Decimal = Decimal("0")
    special_allowance: Decimal = Decimal("0")
    is_pf_applicable: bool = True
    is_esic_applicable: bool = True


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    department: str | None = None
    designation: str | None = None
    bank_account: str | None = None
    bank_ifsc: str | None = None
    basic_salary: Decimal | None = None
    hra: Decimal | None = None
    da: Decimal | None = None
    special_allowance: Decimal | None = None
    is_pf_applicable: bool | None = None
    is_esic_applicable: bool | None = None
    status: str | None = None


class EmployeeResponse(BaseModel):
    id: str
    employee_code: str
    full_name: str
    email: str
    department: str
    designation: str
    date_of_joining: date
    pan_number: str | None
    uan_number: str | None
    bank_account: str | None
    bank_ifsc: str | None
    basic_salary: Decimal
    hra: Decimal
    da: Decimal
    special_allowance: Decimal
    is_pf_applicable: bool
    is_esic_applicable: bool
    status: str
    gross_salary: Decimal | None = None

    model_config = {"from_attributes": True}


class PayrollRunCreate(BaseModel):
    month: int
    year: int
    notes: str | None = None


class PayrollEntryOverride(BaseModel):
    employee_id: str
    days_worked: int
    other_allowances: Decimal = Decimal("0")
    other_deductions: Decimal = Decimal("0")
    tds: Decimal = Decimal("0")


class PayrollProcessRequest(BaseModel):
    overrides: list[PayrollEntryOverride] = []


class PayrollEntryResponse(BaseModel):
    id: str
    employee_id: str
    employee_code: str
    employee_name: str
    days_in_month: int
    days_worked: int
    loss_of_pay_days: int
    basic_salary: Decimal
    hra: Decimal
    da: Decimal
    special_allowance: Decimal
    other_allowances: Decimal
    gross_salary: Decimal
    pf_employee: Decimal
    pf_employer: Decimal
    esic_employee: Decimal
    esic_employer: Decimal
    professional_tax: Decimal
    tds: Decimal
    other_deductions: Decimal
    total_deductions: Decimal
    net_salary: Decimal

    model_config = {"from_attributes": True}


class PayrollRunResponse(BaseModel):
    id: str
    month: int
    year: int
    status: str
    notes: str | None
    created_at: datetime
    approved_at: datetime | None
    entries: list[PayrollEntryResponse] = []
    total_gross: Decimal = Decimal("0")
    total_net: Decimal = Decimal("0")
    total_employer_cost: Decimal = Decimal("0")

    model_config = {"from_attributes": True}

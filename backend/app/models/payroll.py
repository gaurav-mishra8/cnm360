import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Numeric, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organisations.id"), nullable=False)
    employee_code: Mapped[str] = mapped_column(String(20), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    designation: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_joining: Mapped[date] = mapped_column(Date, nullable=False)
    pan_number: Mapped[str | None] = mapped_column(String(10))
    uan_number: Mapped[str | None] = mapped_column(String(12))
    esic_number: Mapped[str | None] = mapped_column(String(17))
    bank_account: Mapped[str | None] = mapped_column(String(20))
    bank_ifsc: Mapped[str | None] = mapped_column(String(11))
    # Salary structure
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    hra: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    da: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    special_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    # Statutory
    is_pf_applicable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_esic_applicable: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, inactive, terminated
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    payroll_entries: Mapped[list["PayrollEntry"]] = relationship("PayrollEntry", back_populates="employee")


class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organisations.id"), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, processed, approved, paid
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)

    entries: Mapped[list["PayrollEntry"]] = relationship("PayrollEntry", back_populates="run", cascade="all, delete-orphan")


class PayrollEntry(Base):
    __tablename__ = "payroll_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payroll_run_id: Mapped[str] = mapped_column(String(36), ForeignKey("payroll_runs.id"), nullable=False)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    days_in_month: Mapped[int] = mapped_column(Integer, nullable=False)
    days_worked: Mapped[int] = mapped_column(Integer, nullable=False)
    loss_of_pay_days: Mapped[int] = mapped_column(Integer, default=0)
    # Earnings
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    hra: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    da: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    special_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    other_allowances: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    gross_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    # Deductions
    pf_employee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    pf_employer: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    esic_employee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    esic_employer: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    professional_tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    tds: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    other_deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total_deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    net_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    run: Mapped["PayrollRun"] = relationship("PayrollRun", back_populates="entries")
    employee: Mapped["Employee"] = relationship("Employee", back_populates="payroll_entries")

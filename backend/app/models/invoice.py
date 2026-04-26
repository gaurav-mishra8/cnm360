import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organisations.id"), nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(20), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)
    # Customer details (inline for simplicity)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_address: Mapped[str | None] = mapped_column(Text)
    customer_gstin: Mapped[str | None] = mapped_column(String(15))
    customer_email: Mapped[str | None] = mapped_column(String(255))
    # GST
    place_of_supply: Mapped[str | None] = mapped_column(String(50))
    is_igst: Mapped[bool] = mapped_column(Boolean, default=False)
    # Totals (denormalized for quick access)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    total_cgst: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    total_sgst: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    total_igst: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, sent, paid, cancelled
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    line_items: Mapped[list["InvoiceLineItem"]] = relationship(
        "InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan"
    )


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    hsn_sac_code: Mapped[str | None] = mapped_column(String(20))
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), default=1)
    unit: Mapped[str | None] = mapped_column(String(20))
    rate: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=18)
    cgst: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    sgst: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    igst: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="line_items")

from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal


class InvoiceLineItemCreate(BaseModel):
    description: str
    hsn_sac_code: str | None = None
    quantity: Decimal = Decimal("1")
    unit: str | None = None
    rate: Decimal
    gst_rate: Decimal = Decimal("18")


class InvoiceLineItemResponse(BaseModel):
    id: str
    description: str
    hsn_sac_code: str | None
    quantity: Decimal
    unit: str | None
    rate: Decimal
    amount: Decimal
    gst_rate: Decimal
    cgst: Decimal
    sgst: Decimal
    igst: Decimal
    total: Decimal

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    date: date
    due_date: date | None = None
    customer_name: str
    customer_address: str | None = None
    customer_gstin: str | None = None
    customer_email: str | None = None
    place_of_supply: str | None = None
    is_igst: bool = False
    notes: str | None = None
    line_items: list[InvoiceLineItemCreate]


class InvoiceUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None
    due_date: date | None = None


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    date: date
    due_date: date | None
    customer_name: str
    customer_address: str | None
    customer_gstin: str | None
    customer_email: str | None
    place_of_supply: str | None
    is_igst: bool
    subtotal: Decimal
    total_cgst: Decimal
    total_sgst: Decimal
    total_igst: Decimal
    total_amount: Decimal
    notes: str | None
    status: str
    created_at: datetime
    line_items: list[InvoiceLineItemResponse] = []

    model_config = {"from_attributes": True}

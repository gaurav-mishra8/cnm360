from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.invoice import Invoice, InvoiceLineItem
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate


def _next_invoice_number(db: Session, org_id: str, year: int) -> str:
    count = db.query(Invoice).filter(
        Invoice.org_id == org_id,
        Invoice.invoice_number.like(f"INV-{year}-%")
    ).count()
    return f"INV-{year}-{count + 1:04d}"


def _calculate_line(item_data, is_igst: bool) -> dict:
    amount = (item_data.quantity * item_data.rate).quantize(Decimal("0.01"))
    gst_amount = (amount * item_data.gst_rate / 100).quantize(Decimal("0.01"))
    if is_igst:
        cgst = sgst = Decimal("0")
        igst = gst_amount
    else:
        cgst = sgst = (gst_amount / 2).quantize(Decimal("0.01"))
        igst = Decimal("0")
    total = amount + cgst + sgst + igst
    return dict(
        description=item_data.description,
        hsn_sac_code=item_data.hsn_sac_code,
        quantity=item_data.quantity,
        unit=item_data.unit,
        rate=item_data.rate,
        amount=amount,
        gst_rate=item_data.gst_rate,
        cgst=cgst, sgst=sgst, igst=igst,
        total=total,
    )


def get_invoices(db: Session, org_id: str) -> list[Invoice]:
    return db.query(Invoice).filter(Invoice.org_id == org_id).order_by(Invoice.date.desc()).all()


def get_invoice(db: Session, org_id: str, invoice_id: str) -> Invoice | None:
    return db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.org_id == org_id).first()


def create_invoice(db: Session, org_id: str, user_id: str, data: InvoiceCreate) -> Invoice:
    invoice_number = _next_invoice_number(db, org_id, data.date.year)
    invoice = Invoice(
        org_id=org_id, created_by=user_id,
        invoice_number=invoice_number,
        date=data.date, due_date=data.due_date,
        customer_name=data.customer_name,
        customer_address=data.customer_address,
        customer_gstin=data.customer_gstin,
        customer_email=data.customer_email,
        place_of_supply=data.place_of_supply,
        is_igst=data.is_igst,
        notes=data.notes,
    )
    db.add(invoice)
    db.flush()

    subtotal = total_cgst = total_sgst = total_igst = Decimal("0")
    for item_data in data.line_items:
        calc = _calculate_line(item_data, data.is_igst)
        line = InvoiceLineItem(invoice_id=invoice.id, **calc)
        db.add(line)
        subtotal += calc["amount"]
        total_cgst += calc["cgst"]
        total_sgst += calc["sgst"]
        total_igst += calc["igst"]

    invoice.subtotal = subtotal
    invoice.total_cgst = total_cgst
    invoice.total_sgst = total_sgst
    invoice.total_igst = total_igst
    invoice.total_amount = subtotal + total_cgst + total_sgst + total_igst
    db.commit()
    db.refresh(invoice)
    return invoice


def update_invoice(db: Session, invoice: Invoice, data: InvoiceUpdate) -> Invoice:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(invoice, k, v)
    db.commit()
    db.refresh(invoice)
    return invoice

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from app.services import invoice as svc
from app.services.pdf import generate_invoice

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceResponse])
def list_invoices(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.get_invoices(db, current_user.org_id)


@router.post("", response_model=InvoiceResponse, status_code=201)
def create_invoice(data: InvoiceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.create_invoice(db, current_user.org_id, current_user.id, data)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = svc.get_invoice(db, current_user.org_id, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return inv


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(invoice_id: str, data: InvoiceUpdate,
                   current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = svc.get_invoice(db, current_user.org_id, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return svc.update_invoice(db, inv, data)


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = svc.get_invoice(db, current_user.org_id, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    org = current_user.organisation
    pdf_bytes = generate_invoice(org, inv)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{inv.invoice_number}.pdf"'},
    )

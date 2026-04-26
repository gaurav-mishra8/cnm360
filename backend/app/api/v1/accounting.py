from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.accounting import (
    AccountCreate, AccountUpdate, AccountResponse,
    JournalEntryCreate, JournalEntryResponse, JournalLineResponse,
    TrialBalanceResponse, ProfitLossResponse, BalanceSheetResponse,
)
from app.services import accounting as svc
from app.services.accounting import get_cash_flow

router = APIRouter(prefix="/accounting", tags=["accounting"])


# --- Chart of Accounts ---

@router.get("/accounts", response_model=list[AccountResponse])
def list_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.get_accounts(db, current_user.org_id)


@router.post("/accounts", response_model=AccountResponse, status_code=201)
def create_account(data: AccountCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.create_account(db, current_user.org_id, data)


@router.put("/accounts/{account_id}", response_model=AccountResponse)
def update_account(account_id: str, data: AccountUpdate,
                   current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = svc.get_accounts(db, current_user.org_id)
    account = next((a for a in accounts if a.id == account_id), None)
    if not account:
        raise HTTPException(404, "Account not found")
    return svc.update_account(db, account, data)


@router.post("/accounts/seed", status_code=204)
def seed_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    svc.seed_default_accounts(db, current_user.org_id)


# --- Journal Entries ---

def _enrich_lines(entry, db):
    from app.models.accounting import Account
    for line in entry.lines:
        acc = db.query(Account).filter(Account.id == line.account_id).first()
        if acc:
            line.account_code = acc.code
            line.account_name = acc.name
    return entry


@router.get("/journal-entries", response_model=list[JournalEntryResponse])
def list_journal_entries(skip: int = 0, limit: int = 50,
                         current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entries = svc.get_journal_entries(db, current_user.org_id, skip, limit)
    for e in entries:
        _enrich_lines(e, db)
    return entries


@router.post("/journal-entries", response_model=JournalEntryResponse, status_code=201)
def create_journal_entry(data: JournalEntryCreate,
                         current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = svc.create_journal_entry(db, current_user.org_id, current_user.id, data)
    return _enrich_lines(entry, db)


@router.get("/journal-entries/{entry_id}", response_model=JournalEntryResponse)
def get_journal_entry(entry_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = svc.get_journal_entry(db, current_user.org_id, entry_id)
    if not entry:
        raise HTTPException(404, "Journal entry not found")
    return _enrich_lines(entry, db)


@router.post("/journal-entries/{entry_id}/post", response_model=JournalEntryResponse)
def post_entry(entry_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = svc.get_journal_entry(db, current_user.org_id, entry_id)
    if not entry:
        raise HTTPException(404, "Journal entry not found")
    if entry.status != "draft":
        raise HTTPException(400, f"Cannot post entry with status '{entry.status}'")
    return _enrich_lines(svc.post_journal_entry(db, entry), db)


@router.post("/journal-entries/{entry_id}/void", response_model=JournalEntryResponse)
def void_entry(entry_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = svc.get_journal_entry(db, current_user.org_id, entry_id)
    if not entry:
        raise HTTPException(404, "Journal entry not found")
    if entry.status == "voided":
        raise HTTPException(400, "Entry already voided")
    return _enrich_lines(svc.void_journal_entry(db, entry), db)


# --- Reports ---

@router.get("/reports/trial-balance", response_model=TrialBalanceResponse)
def trial_balance(from_date: date, to_date: date,
                  current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.get_trial_balance(db, current_user.org_id, from_date, to_date)


@router.get("/reports/profit-loss", response_model=ProfitLossResponse)
def profit_loss(from_date: date, to_date: date,
                current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.get_profit_loss(db, current_user.org_id, from_date, to_date)


@router.get("/reports/balance-sheet", response_model=BalanceSheetResponse)
def balance_sheet(as_of: date, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.get_balance_sheet(db, current_user.org_id, as_of)


@router.get("/reports/cash-flow")
def cash_flow(from_date: date, to_date: date,
              current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_cash_flow(db, current_user.org_id, from_date, to_date)

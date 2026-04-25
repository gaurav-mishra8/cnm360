from pydantic import BaseModel, model_validator
from datetime import date, datetime
from decimal import Decimal


class AccountCreate(BaseModel):
    code: str
    name: str
    type: str  # asset, liability, equity, revenue, expense
    sub_type: str
    parent_id: str | None = None
    opening_balance: Decimal = Decimal("0")


class AccountUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    opening_balance: Decimal | None = None


class AccountResponse(BaseModel):
    id: str
    code: str
    name: str
    type: str
    sub_type: str
    parent_id: str | None
    is_active: bool
    opening_balance: Decimal

    model_config = {"from_attributes": True}


class JournalLineCreate(BaseModel):
    account_id: str
    description: str | None = None
    debit: Decimal = Decimal("0")
    credit: Decimal = Decimal("0")


class JournalLineResponse(BaseModel):
    id: str
    account_id: str
    account_code: str | None = None
    account_name: str | None = None
    description: str | None
    debit: Decimal
    credit: Decimal

    model_config = {"from_attributes": True}


class JournalEntryCreate(BaseModel):
    date: date
    reference: str | None = None
    description: str
    lines: list[JournalLineCreate]

    @model_validator(mode="after")
    def validate_balanced(self):
        total_debit = sum(l.debit for l in self.lines)
        total_credit = sum(l.credit for l in self.lines)
        if abs(total_debit - total_credit) > Decimal("0.01"):
            raise ValueError(f"Journal entry must balance: debits={total_debit}, credits={total_credit}")
        if len(self.lines) < 2:
            raise ValueError("Journal entry must have at least 2 lines")
        return self


class JournalEntryResponse(BaseModel):
    id: str
    entry_number: str
    date: date
    reference: str | None
    description: str
    status: str
    created_at: datetime
    lines: list[JournalLineResponse]

    model_config = {"from_attributes": True}


class TrialBalanceRow(BaseModel):
    account_id: str
    code: str
    name: str
    type: str
    debit: Decimal
    credit: Decimal


class TrialBalanceResponse(BaseModel):
    rows: list[TrialBalanceRow]
    total_debit: Decimal
    total_credit: Decimal
    from_date: date
    to_date: date


class PLRow(BaseModel):
    account_id: str
    code: str
    name: str
    amount: Decimal


class ProfitLossResponse(BaseModel):
    revenue: list[PLRow]
    expenses: list[PLRow]
    total_revenue: Decimal
    total_expenses: Decimal
    net_profit: Decimal
    from_date: date
    to_date: date


class BalanceSheetSection(BaseModel):
    items: list[PLRow]
    total: Decimal


class BalanceSheetResponse(BaseModel):
    assets: BalanceSheetSection
    liabilities: BalanceSheetSection
    equity: BalanceSheetSection
    as_of: date

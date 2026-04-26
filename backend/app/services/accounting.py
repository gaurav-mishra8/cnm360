from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.accounting import Account, JournalEntry, JournalLine
from app.schemas.accounting import (
    AccountCreate, AccountUpdate, JournalEntryCreate,
    TrialBalanceResponse, TrialBalanceRow,
    ProfitLossResponse, PLRow,
    BalanceSheetResponse, BalanceSheetSection,
)

ACCOUNT_TYPES = {
    "asset": ["asset", "liability", "equity", "revenue", "expense"],
}

DEFAULT_ACCOUNTS = [
    # Assets
    ("1001", "Cash in Hand", "asset", "cash_and_bank"),
    ("1002", "Bank Account - Current", "asset", "cash_and_bank"),
    ("1003", "Bank Account - Savings", "asset", "cash_and_bank"),
    ("1101", "Trade Debtors", "asset", "accounts_receivable"),
    ("1102", "GST Input Credit", "asset", "accounts_receivable"),
    ("1201", "Inventory", "asset", "current_asset"),
    ("1202", "Prepaid Expenses", "asset", "current_asset"),
    ("1203", "Advances to Suppliers", "asset", "current_asset"),
    ("1301", "Land and Building", "asset", "fixed_asset"),
    ("1302", "Plant and Machinery", "asset", "fixed_asset"),
    ("1303", "Furniture and Fixtures", "asset", "fixed_asset"),
    ("1304", "Computers and IT Equipment", "asset", "fixed_asset"),
    ("1305", "Vehicles", "asset", "fixed_asset"),
    ("1390", "Accumulated Depreciation", "asset", "fixed_asset"),
    # Liabilities
    ("2001", "Trade Creditors", "liability", "accounts_payable"),
    ("2002", "GST Payable", "liability", "tax_payable"),
    ("2003", "TDS Payable", "liability", "tax_payable"),
    ("2004", "PF Payable", "liability", "tax_payable"),
    ("2005", "ESIC Payable", "liability", "tax_payable"),
    ("2006", "Professional Tax Payable", "liability", "tax_payable"),
    ("2007", "Salary Payable", "liability", "current_liability"),
    ("2008", "Advance from Customers", "liability", "current_liability"),
    ("2101", "Bank Loan", "liability", "long_term_loan"),
    ("2102", "Directors Loan", "liability", "long_term_loan"),
    # Equity
    ("3001", "Partner Capital / Share Capital", "equity", "capital"),
    ("3002", "Retained Earnings", "equity", "retained_earnings"),
    # Revenue
    ("4001", "Sales - Services", "revenue", "operating_revenue"),
    ("4002", "Sales - Products", "revenue", "operating_revenue"),
    ("4003", "Other Income", "revenue", "other_revenue"),
    ("4004", "Interest Income", "revenue", "other_revenue"),
    # Expenses
    ("5001", "Direct Material Cost", "expense", "cost_of_goods_sold"),
    ("5002", "Direct Labour Cost", "expense", "cost_of_goods_sold"),
    ("5101", "Salaries and Wages", "expense", "operating_expense"),
    ("5102", "PF Employer Contribution", "expense", "operating_expense"),
    ("5103", "ESIC Employer Contribution", "expense", "operating_expense"),
    ("5104", "Professional Tax - Employer", "expense", "operating_expense"),
    ("5105", "Staff Welfare", "expense", "operating_expense"),
    ("5201", "Rent", "expense", "operating_expense"),
    ("5202", "Utilities", "expense", "operating_expense"),
    ("5203", "Office Supplies", "expense", "operating_expense"),
    ("5204", "Travel and Conveyance", "expense", "operating_expense"),
    ("5205", "Communication Expenses", "expense", "operating_expense"),
    ("5301", "Professional Fees", "expense", "operating_expense"),
    ("5302", "Audit Fees", "expense", "operating_expense"),
    ("5303", "Legal Expenses", "expense", "operating_expense"),
    ("5401", "Bank Charges", "expense", "operating_expense"),
    ("5402", "Insurance", "expense", "operating_expense"),
    ("5403", "Depreciation", "expense", "operating_expense"),
    ("5404", "Miscellaneous Expenses", "expense", "operating_expense"),
]


def seed_default_accounts(db: Session, org_id: str):
    existing = db.query(Account).filter(Account.org_id == org_id).count()
    if existing > 0:
        return
    for code, name, acc_type, sub_type in DEFAULT_ACCOUNTS:
        db.add(Account(org_id=org_id, code=code, name=name, type=acc_type, sub_type=sub_type))
    db.commit()


def get_accounts(db: Session, org_id: str) -> list[Account]:
    return db.query(Account).filter(Account.org_id == org_id).order_by(Account.code).all()


def create_account(db: Session, org_id: str, data: AccountCreate) -> Account:
    account = Account(org_id=org_id, **data.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_account(db: Session, account: Account, data: AccountUpdate) -> Account:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(account, k, v)
    db.commit()
    db.refresh(account)
    return account


def _next_entry_number(db: Session, org_id: str, year: int) -> str:
    count = db.query(JournalEntry).filter(
        JournalEntry.org_id == org_id,
        JournalEntry.entry_number.like(f"JE-{year}-%")
    ).count()
    return f"JE-{year}-{count + 1:04d}"


def create_journal_entry(db: Session, org_id: str, user_id: str, data: JournalEntryCreate) -> JournalEntry:
    entry_number = _next_entry_number(db, org_id, data.date.year)
    entry = JournalEntry(
        org_id=org_id,
        entry_number=entry_number,
        date=data.date,
        reference=data.reference,
        description=data.description,
        status="draft",
        created_by=user_id,
    )
    db.add(entry)
    db.flush()

    for line_data in data.lines:
        line = JournalLine(
            journal_entry_id=entry.id,
            account_id=line_data.account_id,
            description=line_data.description,
            debit=line_data.debit,
            credit=line_data.credit,
        )
        db.add(line)

    db.commit()
    db.refresh(entry)
    return entry


def get_journal_entries(db: Session, org_id: str, skip: int = 0, limit: int = 50) -> list[JournalEntry]:
    return (
        db.query(JournalEntry)
        .filter(JournalEntry.org_id == org_id)
        .order_by(JournalEntry.date.desc(), JournalEntry.created_at.desc())
        .offset(skip).limit(limit).all()
    )


def get_journal_entry(db: Session, org_id: str, entry_id: str) -> JournalEntry | None:
    return db.query(JournalEntry).filter(
        JournalEntry.id == entry_id, JournalEntry.org_id == org_id
    ).first()


def post_journal_entry(db: Session, entry: JournalEntry) -> JournalEntry:
    from datetime import datetime
    entry.status = "posted"
    entry.posted_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return entry


def void_journal_entry(db: Session, entry: JournalEntry) -> JournalEntry:
    entry.status = "voided"
    db.commit()
    db.refresh(entry)
    return entry


def _account_balance(db: Session, account: Account, from_date: date, to_date: date) -> Decimal:
    lines = (
        db.query(JournalLine)
        .join(JournalEntry)
        .filter(
            JournalLine.account_id == account.id,
            JournalEntry.status == "posted",
            JournalEntry.date >= from_date,
            JournalEntry.date <= to_date,
        )
        .all()
    )
    total_debit = sum(l.debit for l in lines)
    total_credit = sum(l.credit for l in lines)

    # For asset/expense: normal balance is debit; for liability/equity/revenue: normal balance is credit
    if account.type in ("asset", "expense"):
        return account.opening_balance + total_debit - total_credit
    else:
        return account.opening_balance + total_credit - total_debit


def get_trial_balance(db: Session, org_id: str, from_date: date, to_date: date) -> TrialBalanceResponse:
    accounts = db.query(Account).filter(Account.org_id == org_id, Account.is_active == True).order_by(Account.code).all()
    rows = []
    total_debit = Decimal("0")
    total_credit = Decimal("0")

    for acc in accounts:
        lines = (
            db.query(JournalLine)
            .join(JournalEntry)
            .filter(
                JournalLine.account_id == acc.id,
                JournalEntry.status == "posted",
                JournalEntry.date >= from_date,
                JournalEntry.date <= to_date,
            )
            .all()
        )
        d = sum(l.debit for l in lines) + (acc.opening_balance if acc.type in ("asset", "expense") else Decimal("0"))
        c = sum(l.credit for l in lines) + (acc.opening_balance if acc.type in ("liability", "equity", "revenue") else Decimal("0"))

        if d > 0 or c > 0:
            rows.append(TrialBalanceRow(account_id=acc.id, code=acc.code, name=acc.name, type=acc.type, debit=d, credit=c))
            total_debit += d
            total_credit += c

    return TrialBalanceResponse(rows=rows, total_debit=total_debit, total_credit=total_credit, from_date=from_date, to_date=to_date)


def get_profit_loss(db: Session, org_id: str, from_date: date, to_date: date) -> ProfitLossResponse:
    accounts = db.query(Account).filter(Account.org_id == org_id, Account.is_active == True).all()
    revenue_rows, expense_rows = [], []
    total_revenue = total_expenses = Decimal("0")

    for acc in accounts:
        if acc.type not in ("revenue", "expense"):
            continue
        bal = _account_balance(db, acc, from_date, to_date)
        row = PLRow(account_id=acc.id, code=acc.code, name=acc.name, amount=bal)
        if acc.type == "revenue":
            revenue_rows.append(row)
            total_revenue += bal
        else:
            expense_rows.append(row)
            total_expenses += bal

    return ProfitLossResponse(
        revenue=revenue_rows, expenses=expense_rows,
        total_revenue=total_revenue, total_expenses=total_expenses,
        net_profit=total_revenue - total_expenses,
        from_date=from_date, to_date=to_date,
    )


def get_cash_flow(db: Session, org_id: str, from_date: date, to_date: date) -> dict:
    from app.models.accounting import Account, JournalLine, JournalEntry

    cash_accounts = db.query(Account).filter(
        Account.org_id == org_id,
        Account.sub_type == "cash_and_bank",
        Account.is_active == True,
    ).all()
    cash_ids = {a.id for a in cash_accounts}

    opening = sum(a.opening_balance for a in cash_accounts)

    entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.org_id == org_id, JournalEntry.status == "posted",
                JournalEntry.date >= from_date, JournalEntry.date <= to_date)
        .all()
    )

    operating_in = operating_out = Decimal("0")
    investing_in = investing_out = Decimal("0")
    financing_in = financing_out = Decimal("0")
    details = []

    for entry in entries:
        cash_lines = [l for l in entry.lines if l.account_id in cash_ids]
        other_lines = [l for l in entry.lines if l.account_id not in cash_ids]
        if not cash_lines:
            continue

        cash_debit = sum(l.debit for l in cash_lines)
        cash_credit = sum(l.credit for l in cash_lines)
        net = cash_debit - cash_credit  # positive = inflow

        # Categorise by the other side of the entry
        category = "operating"
        for ol in other_lines:
            acc = db.query(Account).filter(Account.id == ol.account_id).first()
            if acc:
                if acc.sub_type in ("fixed_asset",):
                    category = "investing"
                elif acc.sub_type in ("long_term_loan", "capital", "retained_earnings"):
                    category = "financing"

        if category == "operating":
            if net >= 0:
                operating_in += net
            else:
                operating_out += abs(net)
        elif category == "investing":
            if net >= 0:
                investing_in += net
            else:
                investing_out += abs(net)
        else:
            if net >= 0:
                financing_in += net
            else:
                financing_out += abs(net)

        details.append({
            "date": str(entry.date),
            "entry_number": entry.entry_number,
            "description": entry.description,
            "inflow": float(max(net, Decimal("0"))),
            "outflow": float(abs(min(net, Decimal("0")))),
            "category": category,
        })

    closing = opening + operating_in - operating_out + investing_in - investing_out + financing_in - financing_out

    return {
        "from_date": str(from_date),
        "to_date": str(to_date),
        "opening_balance": float(opening),
        "operating": {"inflow": float(operating_in), "outflow": float(operating_out), "net": float(operating_in - operating_out)},
        "investing": {"inflow": float(investing_in), "outflow": float(investing_out), "net": float(investing_in - investing_out)},
        "financing": {"inflow": float(financing_in), "outflow": float(financing_out), "net": float(financing_in - financing_out)},
        "net_change": float(operating_in - operating_out + investing_in - investing_out + financing_in - financing_out),
        "closing_balance": float(closing),
        "details": sorted(details, key=lambda x: x["date"]),
    }


def get_balance_sheet(db: Session, org_id: str, as_of: date) -> BalanceSheetResponse:
    from datetime import date as date_type
    epoch = date_type(2000, 1, 1)
    accounts = db.query(Account).filter(Account.org_id == org_id, Account.is_active == True).all()

    asset_items, liability_items, equity_items = [], [], []
    total_assets = total_liabilities = total_equity = Decimal("0")

    for acc in accounts:
        if acc.type not in ("asset", "liability", "equity"):
            continue
        bal = _account_balance(db, acc, epoch, as_of)
        row = PLRow(account_id=acc.id, code=acc.code, name=acc.name, amount=bal)
        if acc.type == "asset":
            asset_items.append(row)
            total_assets += bal
        elif acc.type == "liability":
            liability_items.append(row)
            total_liabilities += bal
        else:
            equity_items.append(row)
            total_equity += bal

    # Add net profit to equity
    pl = get_profit_loss(db, org_id, date_type(as_of.year, 4, 1), as_of)
    if pl.net_profit != 0:
        equity_items.append(PLRow(account_id="", code="", name="Current Year Profit / Loss", amount=pl.net_profit))
        total_equity += pl.net_profit

    return BalanceSheetResponse(
        assets=BalanceSheetSection(items=asset_items, total=total_assets),
        liabilities=BalanceSheetSection(items=liability_items, total=total_liabilities),
        equity=BalanceSheetSection(items=equity_items, total=total_equity),
        as_of=as_of,
    )

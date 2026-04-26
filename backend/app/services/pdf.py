from fpdf import FPDF
from decimal import Decimal

MONTHS = ["January","February","March","April","May","June",
          "July","August","September","October","November","December"]


def _amount_in_words(amount: float) -> str:
    ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
            "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
            "Seventeen","Eighteen","Nineteen"]
    tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"]

    def _below_1000(n):
        if n == 0:
            return ""
        elif n < 20:
            return ones[n]
        elif n < 100:
            return tens[n // 10] + (" " + ones[n % 10] if n % 10 else "")
        else:
            return ones[n // 100] + " Hundred" + (" " + _below_1000(n % 100) if n % 100 else "")

    rupees = int(amount)
    paise = round((amount - rupees) * 100)
    if rupees == 0:
        words = "Zero"
    elif rupees < 100:
        words = _below_1000(rupees)
    elif rupees < 1000:
        words = _below_1000(rupees)
    elif rupees < 100000:
        words = _below_1000(rupees // 1000) + " Thousand" + (" " + _below_1000(rupees % 1000) if rupees % 1000 else "")
    elif rupees < 10000000:
        words = _below_1000(rupees // 100000) + " Lakh" + (" " + _amount_in_words(rupees % 100000).replace(" Only", "") if rupees % 100000 else "")
    else:
        words = _below_1000(rupees // 10000000) + " Crore" + (" " + _amount_in_words(rupees % 10000000).replace(" Only", "") if rupees % 10000000 else "")

    result = words.strip()
    if paise:
        result += f" and {_below_1000(paise)} Paise"
    return result + " Only"


def generate_payslip(org_name: str, entry, month: int, year: int) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(15, 15, 15)

    # Header
    pdf.set_fill_color(30, 64, 175)
    pdf.rect(0, 0, 210, 25, 'F')
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_xy(15, 7)
    pdf.cell(0, 10, org_name.upper(), new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)

    # Title
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, f"SALARY SLIP — {MONTHS[month - 1].upper()} {year}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Employee details box
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(226, 232, 240)
    pdf.set_font("Helvetica", "", 9)
    col_w = 87

    def row(label, value, fill=True):
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(45, 7, label + ":", fill=fill, border=1)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(col_w - 45, 7, str(value), fill=fill, border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 7, "Employee Details", fill=True, border=1, align="C", new_x="LMARGIN", new_y="NEXT")
    row("Employee Name", entry.employee.full_name)
    row("Employee Code", entry.employee.employee_code)
    row("Department", entry.employee.department)
    row("Designation", entry.employee.designation)
    row("PAN Number", entry.employee.pan_number or "N/A")
    row("UAN Number", entry.employee.uan_number or "N/A")
    row("Days Worked", f"{entry.days_worked} / {entry.days_in_month}")
    pdf.ln(5)

    # Earnings & Deductions table
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(30, 64, 175)
    pdf.set_text_color(255, 255, 255)
    hw = 90
    pdf.cell(hw, 8, "EARNINGS", border=1, fill=True, align="C")
    pdf.cell(hw, 8, "DEDUCTIONS", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.set_fill_color(248, 250, 252)

    def earn_ded_row(earn_label, earn_val, ded_label, ded_val):
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(55, 6.5, earn_label, border=1, fill=True)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(35, 6.5, f"Rs. {earn_val:,.2f}", border=1, fill=True, align="R")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(55, 6.5, ded_label, border=1, fill=True)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(35, 6.5, f"Rs. {ded_val:,.2f}", border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

    earn_ded_row("Basic Salary", float(entry.basic_salary), "PF (Employee)", float(entry.pf_employee))
    earn_ded_row("HRA", float(entry.hra), "ESIC (Employee)", float(entry.esic_employee))
    earn_ded_row("DA", float(entry.da), "Professional Tax", float(entry.professional_tax))
    earn_ded_row("Special Allowance", float(entry.special_allowance), "TDS", float(entry.tds))
    earn_ded_row("Other Allowances", float(entry.other_allowances), "Other Deductions", float(entry.other_deductions))

    # Totals row
    pdf.set_fill_color(219, 234, 254)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(55, 7, "Gross Salary", border=1, fill=True)
    pdf.cell(35, 7, f"Rs. {float(entry.gross_salary):,.2f}", border=1, fill=True, align="R")
    pdf.cell(55, 7, "Total Deductions", border=1, fill=True)
    pdf.cell(35, 7, f"Rs. {float(entry.total_deductions):,.2f}", border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Net pay
    pdf.set_fill_color(22, 163, 74)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 12, f"NET SALARY:  Rs. {float(entry.net_salary):,.2f}", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(3)

    # Amount in words
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_fill_color(248, 250, 252)
    pdf.cell(0, 7, "Amount in Words: " + _amount_in_words(float(entry.net_salary)), border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Employer contributions
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 6, "Employer Contributions (not deducted from salary):", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(90, 6, f"PF (Employer): Rs. {float(entry.pf_employer):,.2f}", border=1, fill=True)
    pdf.cell(90, 6, f"ESIC (Employer): Rs. {float(entry.esic_employer):,.2f}", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "This is a computer-generated salary slip and does not require a signature.", align="C")

    return bytes(pdf.output())


def generate_invoice(org, invoice) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(12, 12, 12)

    # Header bar
    pdf.set_fill_color(30, 64, 175)
    pdf.rect(0, 0, 210, 28, 'F')
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_xy(12, 6)
    pdf.cell(120, 10, org.name.upper())
    pdf.set_font("Helvetica", "B", 22)
    pdf.cell(0, 10, "INVOICE", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)

    # Org + Invoice details side by side
    pdf.set_font("Helvetica", "", 9)
    col = 93
    x_start = pdf.get_x()
    y_start = pdf.get_y()

    # Left: org details
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(col, 5, "From:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    if org.gst_number:
        pdf.cell(col, 5, f"GSTIN: {org.gst_number}", new_x="LMARGIN", new_y="NEXT")
    if org.pan_number:
        pdf.cell(col, 5, f"PAN: {org.pan_number}", new_x="LMARGIN", new_y="NEXT")

    # Right: invoice meta
    pdf.set_xy(x_start + col + 5, y_start)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(40, 5, "Invoice No:")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(50, 5, invoice.invoice_number, new_x="LMARGIN", new_y="NEXT")
    pdf.set_xy(x_start + col + 5, pdf.get_y())
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(40, 5, "Date:")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(50, 5, str(invoice.date), new_x="LMARGIN", new_y="NEXT")
    if invoice.due_date:
        pdf.set_xy(x_start + col + 5, pdf.get_y())
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(40, 5, "Due Date:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(50, 5, str(invoice.due_date), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(5)

    # Bill to box
    pdf.set_fill_color(248, 250, 252)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 6, "Bill To:", fill=True, border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, invoice.customer_name, border="LR", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    if invoice.customer_address:
        for line in invoice.customer_address.split("\n"):
            pdf.cell(0, 5, line.strip(), border="LR", new_x="LMARGIN", new_y="NEXT")
    if invoice.customer_gstin:
        pdf.cell(0, 5, f"GSTIN: {invoice.customer_gstin}", border="LR", new_x="LMARGIN", new_y="NEXT")
    if invoice.customer_email:
        pdf.cell(0, 5, f"Email: {invoice.customer_email}", border="LR", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 2, "", border="LRB", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Line items table
    pdf.set_fill_color(30, 64, 175)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    widths = [8, 65, 18, 16, 12, 22, 22, 22]
    headers = ["#", "Description", "HSN/SAC", "Qty", "Unit", "Rate", "GST%", "Amount"]
    for w, h in zip(widths, headers):
        pdf.cell(w, 7, h, border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_fill_color(248, 250, 252)

    for i, item in enumerate(invoice.line_items, 1):
        pdf.cell(widths[0], 6.5, str(i), border=1, align="C")
        pdf.cell(widths[1], 6.5, item.description[:40], border=1)
        pdf.cell(widths[2], 6.5, item.hsn_sac_code or "", border=1, align="C")
        pdf.cell(widths[3], 6.5, f"{float(item.quantity):.2f}", border=1, align="R")
        pdf.cell(widths[4], 6.5, item.unit or "", border=1, align="C")
        pdf.cell(widths[5], 6.5, f"{float(item.rate):,.2f}", border=1, align="R")
        pdf.cell(widths[6], 6.5, f"{float(item.gst_rate):.0f}%", border=1, align="C")
        pdf.cell(widths[7], 6.5, f"{float(item.amount):,.2f}", border=1, align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(2)

    # Totals
    tw = sum(widths[:-1])
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(tw, 6, "Subtotal", border=1, align="R")
    pdf.cell(widths[-1], 6, f"Rs. {float(invoice.subtotal):,.2f}", border=1, align="R", new_x="LMARGIN", new_y="NEXT")

    if invoice.is_igst:
        pdf.cell(tw, 6, "IGST", border=1, align="R")
        pdf.cell(widths[-1], 6, f"Rs. {float(invoice.total_igst):,.2f}", border=1, align="R", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.cell(tw, 6, "CGST", border=1, align="R")
        pdf.cell(widths[-1], 6, f"Rs. {float(invoice.total_cgst):,.2f}", border=1, align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(tw, 6, "SGST", border=1, align="R")
        pdf.cell(widths[-1], 6, f"Rs. {float(invoice.total_sgst):,.2f}", border=1, align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.set_fill_color(30, 64, 175)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(tw, 8, "TOTAL AMOUNT", border=1, fill=True, align="R")
    pdf.cell(widths[-1], 8, f"Rs. {float(invoice.total_amount):,.2f}", border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(3)

    # Amount in words
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_fill_color(248, 250, 252)
    pdf.cell(0, 7, "Amount in Words: " + _amount_in_words(float(invoice.total_amount)), border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

    if invoice.notes:
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 5, "Notes:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(0, 5, invoice.notes)

    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(80, 5, "")
    pdf.cell(0, 5, "Authorised Signatory", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, org.name, align="R")

    return bytes(pdf.output())

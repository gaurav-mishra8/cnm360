export interface Organisation {
  id: string
  name: string
  gst_number: string | null
  pan_number: string | null
}

export interface User {
  id: string
  email: string
  full_name: string
  role: string
  org_id: string
  organisation: Organisation
  created_at: string
}

export interface Account {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  sub_type: string
  parent_id: string | null
  is_active: boolean
  opening_balance: number
}

export interface JournalLine {
  id: string
  account_id: string
  account_code: string | null
  account_name: string | null
  description: string | null
  debit: number
  credit: number
}

export interface JournalEntry {
  id: string
  entry_number: string
  date: string
  reference: string | null
  description: string
  status: 'draft' | 'posted' | 'voided'
  created_at: string
  lines: JournalLine[]
}

export interface Employee {
  id: string
  employee_code: string
  full_name: string
  email: string
  department: string
  designation: string
  date_of_joining: string
  pan_number: string | null
  uan_number: string | null
  bank_account: string | null
  bank_ifsc: string | null
  basic_salary: number
  hra: number
  da: number
  special_allowance: number
  is_pf_applicable: boolean
  is_esic_applicable: boolean
  status: 'active' | 'inactive' | 'terminated'
  gross_salary: number | null
}

export interface PayrollEntry {
  id: string
  employee_id: string
  employee_code: string
  employee_name: string
  days_in_month: number
  days_worked: number
  loss_of_pay_days: number
  basic_salary: number
  hra: number
  da: number
  special_allowance: number
  other_allowances: number
  gross_salary: number
  pf_employee: number
  pf_employer: number
  esic_employee: number
  esic_employer: number
  professional_tax: number
  tds: number
  other_deductions: number
  total_deductions: number
  net_salary: number
}

export interface PayrollRun {
  id: string
  month: number
  year: number
  status: 'draft' | 'processed' | 'approved' | 'paid'
  notes: string | null
  created_at: string
  approved_at: string | null
  entries: PayrollEntry[]
  total_gross: number
  total_net: number
  total_employer_cost: number
}

export interface InvoiceLineItem {
  id?: string
  description: string
  hsn_sac_code: string | null
  quantity: number
  unit: string
  rate: number
  amount: number
  gst_rate: number
  cgst: number
  sgst: number
  igst: number
  total: number
}

export interface Invoice {
  id: string
  invoice_number: string
  date: string
  due_date: string | null
  customer_name: string
  customer_gstin: string | null
  customer_address: string | null
  customer_email: string | null
  place_of_supply: string | null
  is_igst: boolean
  subtotal: number
  total_cgst: number
  total_sgst: number
  total_igst: number
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  notes: string | null
  created_at: string
  line_items: InvoiceLineItem[]
}

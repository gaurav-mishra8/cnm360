import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

export default function NewEmployee() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    employee_code: '', full_name: '', email: '', department: '', designation: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    pan_number: '', uan_number: '', esic_number: '', bank_account: '', bank_ifsc: '',
    basic_salary: '', hra: '0', da: '0', special_allowance: '0',
    is_pf_applicable: true, is_esic_applicable: true,
  })

  const mutation = useMutation({
    mutationFn: (data: object) => api.post('/payroll/employees', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); navigate('/payroll/employees') },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof msg === 'string' ? msg : 'Failed to save employee')
    },
  })

  function u(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate({
      ...form,
      basic_salary: parseFloat(form.basic_salary),
      hra: parseFloat(form.hra) || 0,
      da: parseFloat(form.da) || 0,
      special_allowance: parseFloat(form.special_allowance) || 0,
    })
  }

  const input = (label: string, key: string, type = 'text', required = true, placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}{!required && <span className="text-slate-400 ml-1">(optional)</span>}</label>
      <input type={type} required={required} value={form[key as keyof typeof form] as string} onChange={u(key)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Add Employee</h1>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            {input('Employee Code', 'employee_code', 'text', true, 'EMP001')}
            {input('Full Name', 'full_name', 'text', true, 'Ravi Kumar')}
            {input('Email', 'email', 'email', true, 'ravi@company.com')}
            {input('Date of Joining', 'date_of_joining', 'date', true)}
            {input('Department', 'department', 'text', true, 'Engineering')}
            {input('Designation', 'designation', 'text', true, 'Software Engineer')}
            {input('PAN Number', 'pan_number', 'text', false, 'ABCDE1234F')}
            {input('UAN Number', 'uan_number', 'text', false, '100000000000')}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Bank Details</h2>
          <div className="grid grid-cols-2 gap-4">
            {input('Bank Account Number', 'bank_account', 'text', false)}
            {input('Bank IFSC Code', 'bank_ifsc', 'text', false, 'HDFC0001234')}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Salary Structure (₹/month)</h2>
          <div className="grid grid-cols-2 gap-4">
            {input('Basic Salary', 'basic_salary', 'number', true, '30000')}
            {input('HRA', 'hra', 'number', false, '0')}
            {input('DA (Dearness Allowance)', 'da', 'number', false, '0')}
            {input('Special Allowance', 'special_allowance', 'number', false, '0')}
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            Gross Salary: ₹{(
              (parseFloat(form.basic_salary) || 0) +
              (parseFloat(form.hra) || 0) +
              (parseFloat(form.da) || 0) +
              (parseFloat(form.special_allowance) || 0)
            ).toLocaleString('en-IN')}/month
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Statutory Deductions</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_pf_applicable} onChange={u('is_pf_applicable')}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">PF Applicable</p>
                <p className="text-xs text-slate-400">Employee: 12% of basic | Employer: 12% of basic</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_esic_applicable} onChange={u('is_esic_applicable')}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">ESIC Applicable</p>
                <p className="text-xs text-slate-400">Employee: 0.75% | Employer: 3.25% (if gross ≤ ₹21,000)</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={mutation.isPending}
            className="px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {mutation.isPending ? 'Saving…' : 'Add Employee'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium">Cancel</button>
        </div>
      </form>
    </div>
  )
}

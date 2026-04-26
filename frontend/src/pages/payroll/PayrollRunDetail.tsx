import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import api from '@/services/api'
import { PayrollRun, PayrollEntry } from '@/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    processed: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    paid: 'bg-emerald-100 text-emerald-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s[status] || ''}`}>{status}</span>
}

export default function PayrollRunDetail() {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: run, isLoading } = useQuery<PayrollRun>({
    queryKey: ['payroll-run', runId],
    queryFn: () => api.get(`/payroll/runs/${runId}`).then(r => r.data),
  })

  const processMutation = useMutation({
    mutationFn: () => api.post(`/payroll/runs/${runId}/process`, { overrides: [] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-run', runId] }),
  })

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/payroll/runs/${runId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-run', runId] }),
  })

  async function downloadPayslip(entry: PayrollEntry) {
    const res = await api.get(`/payroll/runs/${runId}/entries/${entry.id}/payslip`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `Payslip_${entry.employee_code}_${run?.year}_${String(run?.month).padStart(2, '0')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <div className="p-6 text-slate-400">Loading…</div>
  if (!run) return <div className="p-6 text-red-500">Run not found</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-slate-400 hover:text-slate-600 mb-1">← Back</button>
          <h1 className="text-xl font-bold text-slate-900">
            Payroll — {MONTHS[run.month - 1]} {run.year}
          </h1>
          <StatusBadge status={run.status} />
        </div>
        <div className="flex gap-2">
          {(run.status === 'draft' || run.status === 'processed') && (
            <button onClick={() => processMutation.mutate()} disabled={processMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {processMutation.isPending ? 'Processing…' : 'Process Payroll'}
            </button>
          )}
          {run.status === 'processed' && (
            <button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {approveMutation.isPending ? 'Approving…' : 'Approve Payroll'}
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Total Gross Salary</p>
          <p className="text-xl font-bold text-slate-900">₹{fmt(run.total_gross)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Total Net Payable</p>
          <p className="text-xl font-bold text-green-600">₹{fmt(run.total_net)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Total Employer Cost</p>
          <p className="text-xl font-bold text-slate-700">₹{fmt(run.total_employer_cost)}</p>
        </div>
      </div>

      {run.entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          <p>No entries yet. Click <strong>Process Payroll</strong> to calculate salaries for all active employees.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs text-slate-500">
                <th className="text-left px-4 py-3">Employee</th>
                <th className="text-center px-4 py-3">Days</th>
                <th className="text-right px-4 py-3">Basic</th>
                <th className="text-right px-4 py-3">Gross</th>
                <th className="text-right px-4 py-3">PF (Emp)</th>
                <th className="text-right px-4 py-3">ESIC (Emp)</th>
                <th className="text-right px-4 py-3">PT</th>
                <th className="text-right px-4 py-3">TDS</th>
                <th className="text-right px-4 py-3">Total Ded.</th>
                <th className="text-right px-4 py-3 font-bold text-slate-700">Net Pay</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {run.entries.map((entry: PayrollEntry) => (
                <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{entry.employee_name}</p>
                    <p className="text-xs text-slate-400">{entry.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {entry.days_worked}/{entry.days_in_month}
                    {entry.loss_of_pay_days > 0 && <span className="text-red-500 ml-1">(-{entry.loss_of_pay_days})</span>}
                  </td>
                  <td className="px-4 py-3 text-right">₹{fmt(entry.basic_salary)}</td>
                  <td className="px-4 py-3 text-right">₹{fmt(entry.gross_salary)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">₹{fmt(entry.pf_employee)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">₹{fmt(entry.esic_employee)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">₹{fmt(entry.professional_tax)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">₹{fmt(entry.tds)}</td>
                  <td className="px-4 py-3 text-right text-red-600">₹{fmt(entry.total_deductions)}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">₹{fmt(entry.net_salary)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => downloadPayslip(entry)} title="Download Payslip"
                      className="p-1.5 text-slate-400 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr className="font-bold text-sm">
                <td className="px-4 py-3">Total ({run.entries.length} employees)</td>
                <td></td>
                <td></td>
                <td className="px-4 py-3 text-right">₹{fmt(run.total_gross)}</td>
                <td className="px-4 py-3 text-right">₹{fmt(run.entries.reduce((s, e) => s + Number(e.pf_employee), 0))}</td>
                <td className="px-4 py-3 text-right">₹{fmt(run.entries.reduce((s, e) => s + Number(e.esic_employee), 0))}</td>
                <td className="px-4 py-3 text-right">₹{fmt(run.entries.reduce((s, e) => s + Number(e.professional_tax), 0))}</td>
                <td className="px-4 py-3 text-right">₹{fmt(run.entries.reduce((s, e) => s + Number(e.tds), 0))}</td>
                <td className="px-4 py-3 text-right text-red-600">₹{fmt(run.entries.reduce((s, e) => s + Number(e.total_deductions), 0))}</td>
                <td className="px-4 py-3 text-right text-green-700">₹{fmt(run.total_net)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Employer contributions summary */}
      {run.entries.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-3 text-sm">Employer Statutory Contributions</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-1">PF (Employer)</p>
              <p className="font-medium">₹{fmt(run.entries.reduce((s, e) => s + Number(e.pf_employer), 0))}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">ESIC (Employer)</p>
              <p className="font-medium">₹{fmt(run.entries.reduce((s, e) => s + Number(e.esic_employer), 0))}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Total Employer Cost</p>
              <p className="font-bold text-slate-800">₹{fmt(run.total_employer_cost)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

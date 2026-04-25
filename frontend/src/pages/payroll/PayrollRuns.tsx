import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { PayrollRun } from '@/types'
import { Plus } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    processed: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    paid: 'bg-emerald-100 text-emerald-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s[status] || 'bg-slate-100'}`}>{status}</span>
}

export default function PayrollRuns() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))

  const { data: runs = [], isLoading } = useQuery<PayrollRun[]>({
    queryKey: ['payroll-runs'],
    queryFn: () => api.get('/payroll/runs').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/payroll/runs', { month: parseInt(month), year: parseInt(year) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-runs'] }); setShowForm(false) },
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payroll Runs</h1>
          <p className="text-slate-500 text-sm">{runs.length} runs</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> New Payroll Run
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Create Payroll Run</h2>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <input type="number" value={year} onChange={e => setYear(e.target.value)}
                className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}
              className="px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs text-slate-500">
                <th className="text-left px-5 py-3">Period</th>
                <th className="text-right px-5 py-3">Total Gross</th>
                <th className="text-right px-5 py-3">Total Net</th>
                <th className="text-right px-5 py-3">Employer Cost</th>
                <th className="text-center px-5 py-3">Employees</th>
                <th className="text-center px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No payroll runs yet.</td></tr>
              ) : runs.map(run => (
                <tr key={run.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{MONTHS[run.month - 1]} {run.year}</td>
                  <td className="px-5 py-3 text-right">{run.total_gross > 0 ? fmt(run.total_gross) : '—'}</td>
                  <td className="px-5 py-3 text-right">{run.total_net > 0 ? fmt(run.total_net) : '—'}</td>
                  <td className="px-5 py-3 text-right">{run.total_employer_cost > 0 ? fmt(run.total_employer_cost) : '—'}</td>
                  <td className="px-5 py-3 text-center">{run.entries.length}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={run.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/payroll/runs/${run.id}`} className="text-primary-700 text-xs hover:underline">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

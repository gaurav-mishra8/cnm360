import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { TrendingUp, TrendingDown, Users, AlertCircle, Calendar, FileText } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`p-2 rounded-lg ${color}`}><Icon size={16} /></div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-600',
    processed: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    paid: 'bg-emerald-100 text-emerald-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard/summary').then(r => r.data) })

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-slate-400">Loading dashboard…</div>
  )

  const d = data
  const profit = d.month.net_profit

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">Financial overview for {d.month.name}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title={`Revenue (${d.month.name})`} value={fmt(d.month.revenue)}
          icon={TrendingUp} color="bg-green-100 text-green-600" />
        <StatCard title={`Expenses (${d.month.name})`} value={fmt(d.month.expenses)}
          icon={TrendingDown} color="bg-red-100 text-red-600" />
        <StatCard title="Net Profit (Month)" value={fmt(profit)}
          sub={profit >= 0 ? 'Profitable' : 'Loss'}
          icon={profit >= 0 ? TrendingUp : TrendingDown}
          color={profit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'} />
        <StatCard title="Active Employees" value={String(d.employee_count)}
          icon={Users} color="bg-purple-100 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance Calendar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Compliance Calendar</h2>
          </div>
          <div className="space-y-3">
            {d.compliance.map((item: { name: string; due: string; days_left: number; type: string }, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.name}</p>
                  <p className="text-xs text-slate-400">Due {item.due}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  item.days_left <= 5 ? 'bg-red-100 text-red-700' :
                  item.days_left <= 10 ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>{item.days_left}d left</span>
              </div>
            ))}
            {d.compliance.length === 0 && <p className="text-sm text-slate-400">No upcoming deadlines</p>}
          </div>
        </div>

        {/* Recent Journal Entries */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Recent Journal Entries</h2>
          </div>
          <div className="space-y-3">
            {d.recent_journal_entries.map((e: { id: string; entry_number: string; date: string; description: string; status: string }) => (
              <div key={e.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{e.entry_number}</p>
                  <p className="text-xs text-slate-400 truncate">{e.description}</p>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
            {d.recent_journal_entries.length === 0 && <p className="text-sm text-slate-400">No journal entries yet</p>}
          </div>
        </div>

        {/* Recent Payroll Runs */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Recent Payroll Runs</h2>
          </div>
          <div className="space-y-3">
            {d.recent_payroll_runs.map((r: { id: string; month: number; year: number; status: string }) => (
              <div key={r.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{MONTHS[r.month - 1]} {r.year}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
            {d.recent_payroll_runs.length === 0 && <p className="text-sm text-slate-400">No payroll runs yet</p>}
          </div>
        </div>
      </div>

      {/* FY Summary */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-3">Financial Year Summary (Apr – Present)</h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-400 mb-1">Total Revenue</p>
            <p className="text-lg font-bold text-green-600">{fmt(d.fy.revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Total Expenses</p>
            <p className="text-lg font-bold text-red-600">{fmt(d.fy.expenses)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Net Profit / Loss</p>
            <p className={`text-lg font-bold ${d.fy.net_profit >= 0 ? 'text-primary-700' : 'text-amber-600'}`}>{fmt(d.fy.net_profit)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

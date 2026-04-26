import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { TrendingUp, TrendingDown, Users, Calendar, FileText, Receipt } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const PIE_COLORS = ['#1d4ed8','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d']

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function fmtShort(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
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
    draft: 'bg-slate-100 text-slate-600', posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-600', processed: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700', paid: 'bg-emerald-100 text-emerald-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-slate-100'}`}>{status}</span>
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/summary').then(r => r.data),
  })

  if (isLoading) return <div className="flex items-center justify-center h-full text-slate-400">Loading dashboard…</div>

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
        <StatCard title={`Revenue (${d.month.name})`} value={fmt(d.month.revenue)} icon={TrendingUp} color="bg-green-100 text-green-600" />
        <StatCard title={`Expenses (${d.month.name})`} value={fmt(d.month.expenses)} icon={TrendingDown} color="bg-red-100 text-red-600" />
        <StatCard title="Net Profit (Month)" value={fmt(profit)} sub={profit >= 0 ? 'Profitable' : 'Loss'}
          icon={profit >= 0 ? TrendingUp : TrendingDown}
          color={profit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'} />
        <StatCard title="Active Employees" value={String(d.employee_count)} icon={Users} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Monthly bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 text-sm mb-4">Revenue vs Expenses (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.monthly_chart} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#1d4ed8" radius={[3,3,0,0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense breakdown pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 text-sm mb-4">Expense Breakdown (FY)</h2>
          {d.expense_breakdown.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No expense data yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={d.expense_breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                    {d.expense_breakdown.map((_: unknown, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {d.expense_breakdown.slice(0, 5).map((item: { name: string; value: number }, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-slate-600 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="font-medium">{fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance calendar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Compliance Calendar</h2>
          </div>
          <div className="space-y-3">
            {d.compliance.map((item: { name: string; due: string; days_left: number }, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.name}</p>
                  <p className="text-xs text-slate-400">Due {item.due}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  item.days_left <= 5 ? 'bg-red-100 text-red-700' :
                  item.days_left <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>{item.days_left}d</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent journal entries */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-500" />
              <h2 className="font-semibold text-slate-900 text-sm">Recent Journal Entries</h2>
            </div>
            <Link to="/accounting/journal-entries" className="text-xs text-primary-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {d.recent_journal_entries.map((e: { id: string; entry_number: string; description: string; status: string }) => (
              <div key={e.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{e.entry_number}</p>
                  <p className="text-xs text-slate-400 truncate">{e.description}</p>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
            {d.recent_journal_entries.length === 0 && <p className="text-sm text-slate-400">No entries yet</p>}
          </div>
        </div>

        {/* Recent payroll + quick links */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-slate-500" />
              <h2 className="font-semibold text-slate-900 text-sm">Recent Payroll Runs</h2>
            </div>
            <Link to="/payroll/runs" className="text-xs text-primary-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {d.recent_payroll_runs.map((r: { id: string; month: number; year: number; status: string }) => (
              <div key={r.id} className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">{MONTHS[r.month - 1]} {r.year}</p>
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
          <div><p className="text-xs text-slate-400 mb-1">Total Revenue</p><p className="text-lg font-bold text-green-600">{fmt(d.fy.revenue)}</p></div>
          <div><p className="text-xs text-slate-400 mb-1">Total Expenses</p><p className="text-lg font-bold text-red-600">{fmt(d.fy.expenses)}</p></div>
          <div><p className="text-xs text-slate-400 mb-1">Net Profit / Loss</p>
            <p className={`text-lg font-bold ${d.fy.net_profit >= 0 ? 'text-primary-700' : 'text-amber-600'}`}>{fmt(d.fy.net_profit)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

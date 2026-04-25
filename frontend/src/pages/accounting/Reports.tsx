import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

type ReportType = 'trial-balance' | 'profit-loss' | 'balance-sheet'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}

function Section({ title, items, total, color }: { title: string; items: { code: string; name: string; amount: number }[]; total: number; color: string }) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold text-slate-800 mb-2 pb-1 border-b border-slate-200">{title}</h3>
      {items.filter(i => i.amount !== 0).map((item, i) => (
        <div key={i} className="flex justify-between py-1 text-sm">
          <span className="text-slate-600">{item.code && `${item.code} – `}{item.name}</span>
          <span className="font-medium">₹{fmt(item.amount)}</span>
        </div>
      ))}
      <div className={`flex justify-between py-2 mt-1 border-t border-slate-200 font-bold text-sm ${color}`}>
        <span>Total {title}</span>
        <span>₹{fmt(total)}</span>
      </div>
    </div>
  )
}

export default function Reports() {
  const today = new Date().toISOString().split('T')[0]
  const fyStart = new Date().getMonth() >= 3
    ? `${new Date().getFullYear()}-04-01`
    : `${new Date().getFullYear() - 1}-04-01`

  const [report, setReport] = useState<ReportType>('profit-loss')
  const [fromDate, setFromDate] = useState(fyStart)
  const [toDate, setToDate] = useState(today)
  const [asOf, setAsOf] = useState(today)
  const [enabled, setEnabled] = useState(false)

  const plQuery = useQuery({
    queryKey: ['pl', fromDate, toDate],
    queryFn: () => api.get(`/accounting/reports/profit-loss?from_date=${fromDate}&to_date=${toDate}`).then(r => r.data),
    enabled: enabled && report === 'profit-loss',
  })

  const tbQuery = useQuery({
    queryKey: ['tb', fromDate, toDate],
    queryFn: () => api.get(`/accounting/reports/trial-balance?from_date=${fromDate}&to_date=${toDate}`).then(r => r.data),
    enabled: enabled && report === 'trial-balance',
  })

  const bsQuery = useQuery({
    queryKey: ['bs', asOf],
    queryFn: () => api.get(`/accounting/reports/balance-sheet?as_of=${asOf}`).then(r => r.data),
    enabled: enabled && report === 'balance-sheet',
  })

  function run() { setEnabled(false); setTimeout(() => setEnabled(true), 0) }

  const tabs: { id: ReportType; label: string }[] = [
    { id: 'profit-loss', label: 'Profit & Loss' },
    { id: 'trial-balance', label: 'Trial Balance' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Financial Reports</h1>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setReport(t.id); setEnabled(false) }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${report === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-end gap-4">
          {report === 'balance-sheet' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">As Of</label>
              <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </>
          )}
          <button onClick={run}
            className="px-5 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors">
            Generate Report
          </button>
        </div>
      </div>

      {/* P&L */}
      {report === 'profit-loss' && plQuery.data && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Profit & Loss Statement</h2>
          <p className="text-sm text-slate-400 mb-6">{plQuery.data.from_date} to {plQuery.data.to_date}</p>
          <Section title="Revenue" items={plQuery.data.revenue} total={plQuery.data.total_revenue} color="text-green-700" />
          <Section title="Expenses" items={plQuery.data.expenses} total={plQuery.data.total_expenses} color="text-red-700" />
          <div className={`flex justify-between py-3 border-t-2 border-slate-300 text-base font-bold ${plQuery.data.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            <span>Net Profit / Loss</span>
            <span>₹{fmt(plQuery.data.net_profit)}</span>
          </div>
        </div>
      )}

      {/* Trial Balance */}
      {report === 'trial-balance' && tbQuery.data && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Trial Balance</h2>
            <p className="text-sm text-slate-400">{tbQuery.data.from_date} to {tbQuery.data.to_date}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left px-5 py-3">Code</th>
                <th className="text-left px-5 py-3">Account</th>
                <th className="text-right px-5 py-3">Debit</th>
                <th className="text-right px-5 py-3">Credit</th>
              </tr>
            </thead>
            <tbody>
              {tbQuery.data.rows.map((row: { account_id: string; code: string; name: string; debit: number; credit: number }, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-2 font-mono text-slate-500">{row.code}</td>
                  <td className="px-5 py-2 text-slate-800">{row.name}</td>
                  <td className="px-5 py-2 text-right">{row.debit > 0 ? `₹${fmt(row.debit)}` : '—'}</td>
                  <td className="px-5 py-2 text-right">{row.credit > 0 ? `₹${fmt(row.credit)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300">
              <tr className="font-bold text-sm">
                <td colSpan={2} className="px-5 py-3">Total</td>
                <td className="px-5 py-3 text-right">₹{fmt(tbQuery.data.total_debit)}</td>
                <td className="px-5 py-3 text-right">₹{fmt(tbQuery.data.total_credit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Balance Sheet */}
      {report === 'balance-sheet' && bsQuery.data && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Balance Sheet</h2>
          <p className="text-sm text-slate-400 mb-6">As of {bsQuery.data.as_of}</p>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <Section title="Assets" items={bsQuery.data.assets.items} total={bsQuery.data.assets.total} color="text-blue-700" />
            </div>
            <div>
              <Section title="Liabilities" items={bsQuery.data.liabilities.items} total={bsQuery.data.liabilities.total} color="text-red-700" />
              <Section title="Equity" items={bsQuery.data.equity.items} total={bsQuery.data.equity.total} color="text-purple-700" />
              <div className="flex justify-between py-2 border-t-2 border-slate-300 font-bold text-sm text-slate-700">
                <span>Total Liabilities + Equity</span>
                <span>₹{fmt(bsQuery.data.liabilities.total + bsQuery.data.equity.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {(plQuery.isLoading || tbQuery.isLoading || bsQuery.isLoading) && (
        <p className="text-slate-400 text-sm text-center py-8">Generating report…</p>
      )}
    </div>
  )
}

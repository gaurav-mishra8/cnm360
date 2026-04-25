import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Account } from '@/types'
import { Plus, RefreshCw } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-700',
  liability: 'bg-red-100 text-red-700',
  equity: 'bg-purple-100 text-purple-700',
  revenue: 'bg-green-100 text-green-700',
  expense: 'bg-amber-100 text-amber-700',
}

const TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense']
const SUB_TYPES: Record<string, string[]> = {
  asset: ['cash_and_bank', 'accounts_receivable', 'current_asset', 'fixed_asset', 'other_asset'],
  liability: ['accounts_payable', 'tax_payable', 'current_liability', 'long_term_loan', 'other_liability'],
  equity: ['capital', 'retained_earnings'],
  revenue: ['operating_revenue', 'other_revenue'],
  expense: ['cost_of_goods_sold', 'operating_expense', 'other_expense'],
}

export default function ChartOfAccounts() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({ code: '', name: '', type: 'asset', sub_type: 'cash_and_bank', opening_balance: '0' })

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ['accounts'], queryFn: () => api.get('/accounting/accounts').then(r => r.data)
  })

  const seedMutation = useMutation({
    mutationFn: () => api.post('/accounting/accounts/seed'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/accounting/accounts', { ...data, opening_balance: parseFloat(data.opening_balance) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setShowForm(false) },
  })

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(filter.toLowerCase()) ||
    a.code.includes(filter) ||
    a.type.includes(filter.toLowerCase())
  )

  const grouped = TYPES.reduce((acc, t) => {
    acc[t] = filtered.filter(a => a.type === t)
    return acc
  }, {} as Record<string, Account[]>)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chart of Accounts</h1>
          <p className="text-slate-500 text-sm">{accounts.length} accounts</p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              <RefreshCw size={14} /> {seedMutation.isPending ? 'Seeding…' : 'Seed Default Accounts'}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={14} /> Add Account
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">New Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. 1001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Cash in Hand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, sub_type: SUB_TYPES[e.target.value][0] }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sub-Type</label>
              <select value={form.sub_type} onChange={e => setForm(f => ({ ...f, sub_type: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {(SUB_TYPES[form.type] || []).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance (₹)</label>
              <input type="number" value={form.opening_balance} onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.code || !form.name}
              className="px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {createMutation.isPending ? 'Saving…' : 'Save Account'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search accounts…"
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {isLoading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <div className="space-y-4">
          {TYPES.map(type => grouped[type].length === 0 ? null : (
            <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${TYPE_COLORS[type]}`}>
                  {type}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="text-left px-5 py-2">Code</th>
                    <th className="text-left px-5 py-2">Name</th>
                    <th className="text-left px-5 py-2">Sub-Type</th>
                    <th className="text-right px-5 py-2">Opening Balance</th>
                    <th className="text-center px-5 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[type].map(acc => (
                    <tr key={acc.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-slate-600">{acc.code}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{acc.name}</td>
                      <td className="px-5 py-3 text-slate-500">{acc.sub_type.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3 text-right">₹{Number(acc.opening_balance).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${acc.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {acc.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

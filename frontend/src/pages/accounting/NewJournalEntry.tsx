import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import { Account } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

interface LineForm { account_id: string; description: string; debit: string; credit: string }

const emptyLine = (): LineForm => ({ account_id: '', description: '', debit: '0', credit: '0' })

export default function NewJournalEntry() {
  const navigate = useNavigate()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<LineForm[]>([emptyLine(), emptyLine()])
  const [error, setError] = useState('')

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'], queryFn: () => api.get('/accounting/accounts').then(r => r.data)
  })

  const mutation = useMutation({
    mutationFn: (data: object) => api.post('/accounting/journal-entries', data),
    onSuccess: () => navigate('/accounting/journal-entries'),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  function updateLine(i: number, k: keyof LineForm, v: string) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  }

  function addLine() { setLines(ls => [...ls, emptyLine()]) }
  function removeLine(i: number) { if (lines.length > 2) setLines(ls => ls.filter((_, idx) => idx !== i)) }

  function handleSubmit(status: 'draft' | 'post') {
    setError('')
    const payload = {
      date, description, reference: reference || null,
      lines: lines.filter(l => l.account_id).map(l => ({
        account_id: l.account_id,
        description: l.description || null,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })),
    }
    mutation.mutate(payload, {
      onSuccess: async (res) => {
        if (status === 'post') {
          await api.post(`/accounting/journal-entries/${res.data.id}/post`)
        }
        navigate('/accounting/journal-entries')
      },
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-6">New Journal Entry</h1>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Payment received from client"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reference <span className="text-slate-400">(optional)</span></label>
            <input value={reference} onChange={e => setReference(e.target.value)}
              placeholder="e.g. INV-001"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-slate-100">
              <th className="text-left py-2">Account</th>
              <th className="text-left py-2 pl-3">Description</th>
              <th className="text-right py-2 w-32">Debit (₹)</th>
              <th className="text-right py-2 w-32">Credit (₹)</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="py-2 pr-3">
                  <select value={line.account_id} onChange={e => updateLine(i, 'account_id', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">— Select account —</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pl-3 pr-3">
                  <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)}
                    placeholder="Line note"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </td>
                <td className="py-2 pl-3">
                  <input type="number" min="0" value={line.debit} onChange={e => updateLine(i, 'debit', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </td>
                <td className="py-2 pl-3">
                  <input type="number" min="0" value={line.credit} onChange={e => updateLine(i, 'credit', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </td>
                <td className="py-2 pl-2">
                  <button onClick={() => removeLine(i)} disabled={lines.length <= 2}
                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200">
              <td colSpan={2} className="py-2 text-sm font-medium text-slate-500">Total</td>
              <td className="py-2 text-right font-bold">₹{totalDebit.toLocaleString('en-IN')}</td>
              <td className="py-2 pl-3 text-right font-bold">₹{totalCredit.toLocaleString('en-IN')}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        {!isBalanced && (
          <p className="text-red-600 text-xs mb-3">
            Entry is not balanced. Difference: ₹{Math.abs(totalDebit - totalCredit).toLocaleString('en-IN')}
          </p>
        )}

        <button onClick={addLine} className="flex items-center gap-1 text-primary-700 text-sm hover:underline">
          <Plus size={14} /> Add line
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={() => handleSubmit('draft')} disabled={mutation.isPending || !description || lines.filter(l => l.account_id).length < 2}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-sm font-medium transition-colors">
          Save as Draft
        </button>
        <button onClick={() => handleSubmit('post')} disabled={mutation.isPending || !isBalanced || !description || lines.filter(l => l.account_id).length < 2}
          className="px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          Save & Post
        </button>
        <button onClick={() => navigate(-1)} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium">Cancel</button>
      </div>
    </div>
  )
}

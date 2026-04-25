import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { JournalEntry } from '@/types'
import { Plus } from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-600',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s[status] || 'bg-slate-100'}`}>{status}</span>
}

export default function JournalEntries() {
  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ['journal-entries'],
    queryFn: () => api.get('/accounting/journal-entries').then(r => r.data),
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Journal Entries</h1>
          <p className="text-slate-500 text-sm">{entries.length} entries</p>
        </div>
        <Link to="/accounting/journal-entries/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> New Entry
        </Link>
      </div>

      {isLoading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs text-slate-500">
                <th className="text-left px-5 py-3">Entry #</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Description</th>
                <th className="text-left px-5 py-3">Reference</th>
                <th className="text-right px-5 py-3">Amount (Dr)</th>
                <th className="text-center px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No journal entries yet. <Link to="/accounting/journal-entries/new" className="text-primary-700 underline">Create one</Link></td></tr>
              ) : entries.map(entry => {
                const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0)
                return (
                  <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-slate-700 font-medium">{entry.entry_number}</td>
                    <td className="px-5 py-3 text-slate-600">{entry.date}</td>
                    <td className="px-5 py-3 text-slate-800 max-w-xs truncate">{entry.description}</td>
                    <td className="px-5 py-3 text-slate-500">{entry.reference || '—'}</td>
                    <td className="px-5 py-3 text-right font-medium">₹{totalDebit.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={entry.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Download, FileText } from 'lucide-react'
import api from '@/services/api'
import { Invoice } from '@/types'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-600',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s[status] || 'bg-slate-100'}`}>{status}</span>
}

async function downloadInvoicePdf(invoice: Invoice) {
  const res = await api.get(`/invoices/${invoice.id}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `Invoice_${invoice.invoice_number}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Invoices() {
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoices').then(r => r.data),
  })

  if (isLoading) return <div className="p-6 text-slate-400">Loading…</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">GST-compliant invoices for your customers</p>
        </div>
        <Link to="/invoices/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FileText size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No invoices yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first GST invoice to get started</p>
          <Link to="/invoices/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800">
            <Plus size={14} /> Create Invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs text-slate-500">
                <th className="text-left px-5 py-3">Invoice #</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-left px-5 py-3">GST Type</th>
                <th className="text-right px-5 py-3">Subtotal</th>
                <th className="text-right px-5 py-3">GST</th>
                <th className="text-right px-5 py-3">Total</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const gstTotal = inv.is_igst ? inv.total_igst : (inv.total_cgst + inv.total_sgst)
                return (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-primary-700 font-medium">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-slate-600">{inv.date}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{inv.customer_name}</p>
                      {inv.customer_gstin && <p className="text-xs text-slate-400">{inv.customer_gstin}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.is_igst ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {inv.is_igst ? 'IGST' : 'CGST+SGST'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">{fmt(inv.subtotal)}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{fmt(gstTotal)}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800">{fmt(inv.total_amount)}</td>
                    <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-3">
                      <button onClick={() => downloadInvoicePdf(inv)} title="Download PDF"
                        className="p-1.5 text-slate-400 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                        <Download size={14} />
                      </button>
                    </td>
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

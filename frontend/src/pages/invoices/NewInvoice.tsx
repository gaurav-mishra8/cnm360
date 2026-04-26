import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import api from '@/services/api'

interface LineItemForm {
  description: string
  hsn_sac_code: string
  quantity: number
  unit: string
  rate: number
  gst_rate: number
}

const DEFAULT_LINE: LineItemForm = {
  description: '', hsn_sac_code: '', quantity: 1, unit: 'NOS', rate: 0, gst_rate: 18,
}

const GST_RATES = [0, 5, 12, 18, 28]

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}

export default function NewInvoice() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today,
    due_date: '',
    customer_name: '',
    customer_gstin: '',
    customer_address: '',
    place_of_supply: '',
    is_igst: false,
    notes: '',
  })
  const [lines, setLines] = useState<LineItemForm[]>([{ ...DEFAULT_LINE }])
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: object) => api.post('/invoices', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      navigate('/invoices')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Failed to create invoice')
    },
  })

  function updateLine(i: number, field: keyof LineItemForm, value: string | number) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  function addLine() {
    setLines(prev => [...prev, { ...DEFAULT_LINE }])
  }

  function removeLine(i: number) {
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  function calcLine(line: LineItemForm) {
    const amount = line.quantity * line.rate
    const gst = amount * line.gst_rate / 100
    const cgst = form.is_igst ? 0 : gst / 2
    const sgst = form.is_igst ? 0 : gst / 2
    const igst = form.is_igst ? gst : 0
    return { amount, cgst, sgst, igst, total: amount + gst }
  }

  const lineCalcs = lines.map(calcLine)
  const subtotal = lineCalcs.reduce((s, l) => s + l.amount, 0)
  const cgstTotal = lineCalcs.reduce((s, l) => s + l.cgst, 0)
  const sgstTotal = lineCalcs.reduce((s, l) => s + l.sgst, 0)
  const igstTotal = lineCalcs.reduce((s, l) => s + l.igst, 0)
  const grandTotal = lineCalcs.reduce((s, l) => s + l.total, 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    mutation.mutate({
      ...form,
      due_date: form.due_date || null,
      customer_gstin: form.customer_gstin || null,
      customer_address: form.customer_address || null,
      place_of_supply: form.place_of_supply || null,
      notes: form.notes || null,
      line_items: lines.map(l => ({
        description: l.description,
        hsn_sac_code: l.hsn_sac_code || null,
        quantity: l.quantity,
        unit: l.unit || null,
        rate: l.rate,
        gst_rate: l.gst_rate,
      })),
    })
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-slate-400 hover:text-slate-600 mb-1">← Back</button>
          <h1 className="text-xl font-bold text-slate-900">New Invoice</h1>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      {/* Invoice details */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 className="font-semibold text-slate-800 mb-4 text-sm">Invoice Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Invoice Date *</label>
            <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inputCls} />
          </div>
          <div className="col-span-2 flex items-center gap-3 pt-1">
            <input type="checkbox" id="is_igst" checked={form.is_igst}
              onChange={e => setForm(f => ({ ...f, is_igst: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded" />
            <label htmlFor="is_igst" className="text-sm font-medium text-slate-700">
              Inter-state supply (apply IGST instead of CGST+SGST)
            </label>
          </div>
        </div>
      </div>

      {/* Customer details */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 className="font-semibold text-slate-800 mb-4 text-sm">Customer Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Customer Name *</label>
            <input type="text" required value={form.customer_name}
              onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              placeholder="Acme Corporation" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>GSTIN</label>
            <input type="text" value={form.customer_gstin}
              onChange={e => setForm(f => ({ ...f, customer_gstin: e.target.value }))}
              placeholder="27AABCU9603R1ZX" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Place of Supply (State)</label>
            <input type="text" value={form.place_of_supply}
              onChange={e => setForm(f => ({ ...f, place_of_supply: e.target.value }))}
              placeholder="Maharashtra" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input type="text" value={form.customer_address}
              onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))}
              placeholder="123, Business Park, Mumbai" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 className="font-semibold text-slate-800 mb-4 text-sm">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left pb-2 pr-2">Description *</th>
                <th className="text-left pb-2 pr-2 w-28">HSN/SAC</th>
                <th className="text-right pb-2 pr-2 w-16">Qty</th>
                <th className="text-left pb-2 pr-2 w-16">Unit</th>
                <th className="text-right pb-2 pr-2 w-24">Rate (₹)</th>
                <th className="text-right pb-2 pr-2 w-20">GST %</th>
                <th className="text-right pb-2 pr-2 w-24">Amount</th>
                <th className="text-right pb-2 w-20">{form.is_igst ? 'IGST' : 'CGST+SGST'}</th>
                <th className="text-right pb-2 w-24">Total</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lines.map((line, i) => {
                const calc = lineCalcs[i]
                const gstAmt = form.is_igst ? calc.igst : (calc.cgst + calc.sgst)
                return (
                  <tr key={i}>
                    <td className="py-2 pr-2">
                      <input type="text" required value={line.description}
                        onChange={e => updateLine(i, 'description', e.target.value)}
                        placeholder="Service description" className={inputCls} />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="text" value={line.hsn_sac_code}
                        onChange={e => updateLine(i, 'hsn_sac_code', e.target.value)}
                        placeholder="998314" className={inputCls} />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min="0.01" step="0.01" required value={line.quantity}
                        onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)}
                        className={`${inputCls} text-right`} />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="text" value={line.unit}
                        onChange={e => updateLine(i, 'unit', e.target.value)}
                        className={inputCls} />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min="0" step="0.01" required value={line.rate}
                        onChange={e => updateLine(i, 'rate', parseFloat(e.target.value) || 0)}
                        className={`${inputCls} text-right`} />
                    </td>
                    <td className="py-2 pr-2">
                      <select value={line.gst_rate} onChange={e => updateLine(i, 'gst_rate', parseInt(e.target.value))}
                        className={inputCls}>
                        {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2 text-right text-slate-600 font-medium">₹{fmt(calc.amount)}</td>
                    <td className="py-2 pr-2 text-right text-slate-500">₹{fmt(gstAmt)}</td>
                    <td className="py-2 pr-2 text-right font-bold text-slate-800">₹{fmt(calc.total)}</td>
                    <td className="py-2">
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(i)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={addLine}
          className="mt-3 flex items-center gap-1.5 text-sm text-primary-700 hover:text-primary-800 font-medium">
          <Plus size={14} /> Add Line Item
        </button>

        {/* Totals */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span><span>₹{fmt(subtotal)}</span>
            </div>
            {form.is_igst ? (
              <div className="flex justify-between text-slate-600">
                <span>IGST</span><span>₹{fmt(igstTotal)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST</span><span>₹{fmt(cgstTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST</span><span>₹{fmt(sgstTotal)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total</span><span>₹{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <label className={labelCls}>Notes / Terms</label>
        <textarea rows={3} value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Payment terms, bank details, etc." className={inputCls} />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="px-5 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium">
          Cancel
        </button>
        <button type="submit" disabled={mutation.isPending}
          className="px-6 py-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {mutation.isPending ? 'Creating…' : 'Create Invoice'}
        </button>
      </div>
    </form>
  )
}

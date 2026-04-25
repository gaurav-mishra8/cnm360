import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Building2 } from 'lucide-react'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    org_name: '', org_gst_number: '', org_pan_number: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: string, type = 'text', required = true, placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}{!required && <span className="text-slate-400 ml-1">(optional)</span>}</label>
      <input type={type} required={required} value={form[key as keyof typeof form]} onChange={update(key)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-700 rounded-2xl mb-4">
            <Building2 className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">CNM360</h1>
          <p className="text-slate-500 text-sm mt-1">Financial Automation Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Create your organisation</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Organisation</p>
            {field('Organisation Name', 'org_name', 'text', true, 'Acme Pvt. Ltd.')}
            {field('GST Number', 'org_gst_number', 'text', false, '27AABCA1234Z1Z5')}
            {field('PAN Number', 'org_pan_number', 'text', false, 'AABCA1234Z')}

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">Admin Account</p>
            {field('Your Name', 'full_name', 'text', true, 'Priya Sharma')}
            {field('Email', 'email', 'email', true, 'priya@acme.com')}
            {field('Password', 'password', 'password', true, '••••••••')}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 px-4 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

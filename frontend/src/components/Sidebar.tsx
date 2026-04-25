import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, BookOpen, FileText, BarChart3,
  Users, Wallet, LogOut, Building2, ChevronDown
} from 'lucide-react'
import { useState } from 'react'

const navItem = 'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors'
const active = 'bg-primary-700 text-white'
const inactive = 'text-slate-300 hover:bg-slate-700 hover:text-white'

function NavGroup({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors">
        <span className="flex items-center gap-2"><Icon size={14} />{label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="space-y-0.5 mt-0.5">{children}</div>}
    </div>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-64 bg-slate-900 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Building2 className="text-primary-400" size={22} />
          <div>
            <p className="text-white font-bold text-sm leading-tight">CNM360</p>
            <p className="text-slate-400 text-xs truncate max-w-[150px]">{user?.organisation.name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        <NavLink to="/dashboard" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>

        <NavGroup label="Accounting" icon={BookOpen}>
          <NavLink to="/accounting/chart-of-accounts" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
            <BookOpen size={16} /> Chart of Accounts
          </NavLink>
          <NavLink to="/accounting/journal-entries" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
            <FileText size={16} /> Journal Entries
          </NavLink>
          <NavLink to="/accounting/reports" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
            <BarChart3 size={16} /> Reports
          </NavLink>
        </NavGroup>

        <NavGroup label="Payroll" icon={Wallet}>
          <NavLink to="/payroll/employees" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
            <Users size={16} /> Employees
          </NavLink>
          <NavLink to="/payroll/runs" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
            <Wallet size={16} /> Payroll Runs
          </NavLink>
        </NavGroup>
      </nav>

      <div className="px-3 py-4 border-t border-slate-700">
        <div className="px-4 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
          <p className="text-slate-400 text-xs truncate">{user?.email}</p>
        </div>
        <button onClick={handleLogout}
          className={`${navItem} ${inactive} w-full`}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  )
}

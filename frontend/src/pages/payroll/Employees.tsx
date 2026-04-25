import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { Employee } from '@/types'
import { Plus, Users } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function Employees() {
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => api.get('/payroll/employees').then(r => r.data),
  })

  const active = employees.filter(e => e.status === 'active')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500 text-sm">{active.length} active employees</p>
        </div>
        <Link to="/payroll/employees/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> Add Employee
        </Link>
      </div>

      {isLoading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        employees.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>No employees yet.</p>
            <Link to="/payroll/employees/new" className="text-primary-700 text-sm hover:underline mt-1 inline-block">Add your first employee</Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs text-slate-500">
                  <th className="text-left px-5 py-3">Code</th>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Department</th>
                  <th className="text-left px-5 py-3">Designation</th>
                  <th className="text-right px-5 py-3">Gross Salary</th>
                  <th className="text-center px-5 py-3">PF</th>
                  <th className="text-center px-5 py-3">ESIC</th>
                  <th className="text-center px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-slate-500">{emp.employee_code}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{emp.full_name}</p>
                      <p className="text-xs text-slate-400">{emp.email}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{emp.department}</td>
                    <td className="px-5 py-3 text-slate-600">{emp.designation}</td>
                    <td className="px-5 py-3 text-right font-medium">{fmt(emp.gross_salary ?? 0)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${emp.is_pf_applicable ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                        {emp.is_pf_applicable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${emp.is_esic_applicable ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                        {emp.is_esic_applicable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        emp.status === 'active' ? 'bg-green-100 text-green-700' :
                        emp.status === 'inactive' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-600'
                      }`}>{emp.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

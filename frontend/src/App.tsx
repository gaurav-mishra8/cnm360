import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import ChartOfAccounts from '@/pages/accounting/ChartOfAccounts'
import JournalEntries from '@/pages/accounting/JournalEntries'
import NewJournalEntry from '@/pages/accounting/NewJournalEntry'
import Reports from '@/pages/accounting/Reports'
import Employees from '@/pages/payroll/Employees'
import NewEmployee from '@/pages/payroll/NewEmployee'
import PayrollRuns from '@/pages/payroll/PayrollRuns'
import PayrollRunDetail from '@/pages/payroll/PayrollRunDetail'
import Invoices from '@/pages/invoices/Invoices'
import NewInvoice from '@/pages/invoices/NewInvoice'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="accounting/chart-of-accounts" element={<ChartOfAccounts />} />
            <Route path="accounting/journal-entries" element={<JournalEntries />} />
            <Route path="accounting/journal-entries/new" element={<NewJournalEntry />} />
            <Route path="accounting/reports" element={<Reports />} />
            <Route path="payroll/employees" element={<Employees />} />
            <Route path="payroll/employees/new" element={<NewEmployee />} />
            <Route path="payroll/runs" element={<PayrollRuns />} />
            <Route path="payroll/runs/:runId" element={<PayrollRunDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<NewInvoice />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

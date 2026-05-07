import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ProblemList from './pages/Problems/ProblemList'
import ProblemForm from './pages/Problems/ProblemForm'
import ProblemDetail from './pages/Problems/ProblemDetail'
import SolutionForm from './pages/Solutions/SolutionForm'
import SolutionDetail from './pages/Solutions/SolutionDetail'
import Setup from './pages/Setup'
import Reports from './pages/Reports'
import Import from './pages/Import'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="problems" element={<ProblemList />} />
          <Route path="problems/new" element={<ProblemForm />} />
          <Route path="problems/:id" element={<ProblemDetail />} />
          <Route path="problems/:id/edit" element={<ProblemForm />} />
          <Route path="solutions/new/:problemId" element={<SolutionForm />} />
          <Route path="solutions/:id" element={<SolutionDetail />} />
          <Route path="solutions/:id/edit" element={<SolutionForm />} />
          <Route path="setup" element={<Setup />} />
          <Route path="reports" element={<Reports />} />
          <Route path="import" element={<Import />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

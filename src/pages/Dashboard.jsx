import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, AlertCircle, CheckCircle, XCircle, Activity, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import { PROBLEM_PHASES, REVIEW_MILESTONES } from '../constants/workflow'

export default function Dashboard() {
  const { data: statusData = [], isLoading } = useQuery({
    queryKey: ['dashboard-problems'],
    queryFn: async () => {
      const [{ data: problems, error }, { data: statuses }] = await Promise.all([
        supabase.from('t00_problems').select('id, prob_code, title, prob_type, created_at').order('created_at', { ascending: false }),
        supabase.from('v_problem_current_status').select('t00_problems_id, phase_code, phase_name, timestamp'),
      ])
      if (error) throw error
      const statusMap = Object.fromEntries((statuses || []).map(s => [s.t00_problems_id, s]))
      return (problems || []).map(p => ({ ...p, currentStatus: statusMap[p.id] || null }))
    },
  })

  const total = statusData.length
  const open = statusData.filter(p => !['P29', 'P50'].includes(p.currentStatus?.phase_code)).length
  const closed = statusData.filter(p => p.currentStatus?.phase_code === 'P50').length
  const cancelled = statusData.filter(p => p.currentStatus?.phase_code === 'P29').length

  const byCodes = {}
  statusData.forEach(p => {
    const code = p.currentStatus?.phase_code || 'Unknown'
    byCodes[code] = (byCodes[code] || 0) + 1
  })

  const overdue = statusData.filter(p => {
    const code = p.currentStatus?.phase_code
    const milestone = REVIEW_MILESTONES[code]
    if (!milestone) return false
    const ts = new Date(p.currentStatus?.timestamp)
    const dueDate = new Date(ts.getTime() + milestone.weeks * 7 * 24 * 60 * 60 * 1000)
    return new Date() > dueDate
  })

  const recent = statusData.slice(0, 10)

  const statCards = [
    { label: 'Total Problems', value: total, icon: Activity, color: 'blue' },
    { label: 'Open', value: open, icon: AlertCircle, color: 'amber' },
    { label: 'Closed', value: closed, icon: CheckCircle, color: 'green' },
    { label: 'Cancelled', value: cancelled, icon: XCircle, color: 'red' },
  ]

  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <Link
          to="/problems/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Problem
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl border p-5 ${colorMap[color]}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-80">{label}</span>
              <Icon className="h-5 w-5 opacity-60" />
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Distribution</h3>
          <div className="space-y-2">
            {Object.entries(PROBLEM_PHASES).map(([code, phase]) => {
              const count = byCodes[code] || 0
              const pct = total > 0 ? (count / total) * 100 : 0
              return (
                <div key={code}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-gray-600">{code} {phase.name}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${phase.bg} border ${phase.border}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Overdue reviews */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" /> Overdue Reviews
          </h3>
          {overdue.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No overdue reviews</p>
          ) : (
            <div className="space-y-2">
              {overdue.map(p => (
                <Link
                  key={p.id}
                  to={`/problems/${p.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-mono text-gray-500">{p.prob_code}</p>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">
                      {p.title || 'Untitled'}
                    </p>
                  </div>
                  <StatusBadge code={p.currentStatus?.phase_code} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Access</h3>
          <div className="space-y-2">
            {[
              { label: 'All Open Problems', to: '/problems?status=open', count: open },
              { label: 'In Development (P30)', to: '/problems?phase=P30', count: byCodes['P30'] || 0 },
              { label: 'Final Review (P40)', to: '/problems?phase=P40', count: byCodes['P40'] || 0 },
              { label: 'All Problems', to: '/problems', count: total },
            ].map(({ label, to, count }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                <span className="text-gray-700">{label}</span>
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent problems */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Recent Problems</h3>
          <Link to="/problems" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Code</th>
                <th className="px-5 py-3 text-left">Title</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{p.prob_code}</td>
                  <td className="px-5 py-3">
                    <Link to={`/problems/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {p.title || 'Untitled'}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    {p.prob_type && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {p.prob_type}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge code={p.currentStatus?.phase_code} />
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                    No problems recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

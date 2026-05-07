import { useQuery } from '@tanstack/react-query'
import { Download, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import { PROBLEM_PHASES, SOLUTION_PHASES, REVIEW_MILESTONES } from '../constants/workflow'

function SummaryTable({ title, data, cols, emptyMsg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <tr>
              {cols.map(c => <th key={c} className="px-4 py-3 text-left">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {Object.values(row).map((cell, j) => (
                  <td key={j} className="px-4 py-2.5 text-gray-700">{cell}</td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={cols.length} className="px-4 py-6 text-center text-gray-400 text-xs">
                  {emptyMsg || 'No data'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Reports() {
  const { data: problems = [], isLoading: loadingProblems } = useQuery({
    queryKey: ['reports-problems'],
    queryFn: async () => {
      const [{ data: probs, error }, { data: statuses }] = await Promise.all([
        supabase.from('t00_problems').select('id, prob_code, title, prob_type, created_at, lu30_location(loc_name)').order('created_at', { ascending: false }),
        supabase.from('v_problem_current_status').select('t00_problems_id, phase_code, phase_name, timestamp'),
      ])
      if (error) throw error
      const statusMap = Object.fromEntries((statuses || []).map(s => [s.t00_problems_id, s]))
      return (probs || []).map(p => ({ ...p, currentStatus: statusMap[p.id] || null }))
    },
  })

  const { data: solutions = [], isLoading: loadingSolutions } = useQuery({
    queryKey: ['reports-solutions'],
    queryFn: async () => {
      const [{ data: sols, error }, { data: statuses }] = await Promise.all([
        supabase.from('t02_solutions').select('id, sol_num, title, created_at, lu40_cost(cost_val, cost_name), lu40_effort(effort_val, effort_name), lu40_reward(reward_val, reward_name)').order('created_at', { ascending: false }),
        supabase.from('v_solution_current_status').select('t02_solutions_id, phase_code, phase_name'),
      ])
      if (error) throw error
      const statusMap = Object.fromEntries((statuses || []).map(s => [s.t02_solutions_id, s]))
      return (sols || []).map(s => ({ ...s, currentStatus: statusMap[s.id] || null }))
    },
  })

  // By type
  const byType = {}
  problems.forEach(p => {
    const t = p.prob_type || 'Unknown'
    byType[t] = (byType[t] || 0) + 1
  })
  const byTypeRows = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ Type: type, Count: count, '%': `${Math.round((count / problems.length) * 100)}%` }))

  // By location
  const byLocation = {}
  problems.forEach(p => {
    const loc = p.lu30_location?.loc_name || 'Unspecified'
    byLocation[loc] = (byLocation[loc] || 0) + 1
  })
  const byLocationRows = Object.entries(byLocation)
    .sort((a, b) => b[1] - a[1])
    .map(([Location, Count]) => ({ Location, Count }))

  // By phase
  const byPhase = {}
  problems.forEach(p => {
    const code = p.currentStatus?.phase_code || 'Unknown'
    byPhase[code] = (byPhase[code] || 0) + 1
  })
  const byPhaseRows = Object.entries(PROBLEM_PHASES).map(([code, phase]) => ({
    Phase: `${code} — ${phase.name}`,
    Count: byPhase[code] || 0,
  }))

  // Solutions by phase
  const solByPhase = {}
  solutions.forEach(s => {
    const code = s.currentStatus?.phase_code || 'Unknown'
    solByPhase[code] = (solByPhase[code] || 0) + 1
  })
  const solByPhaseRows = Object.entries(SOLUTION_PHASES).map(([code, phase]) => ({
    Phase: `${code} — ${phase.name}`,
    Count: solByPhase[code] || 0,
  }))

  // Average scores
  const avgCost = solutions.length
    ? (solutions.reduce((s, sol) => s + (sol.lu40_cost?.cost_val || 0), 0) / solutions.length).toFixed(1)
    : '—'
  const avgEffort = solutions.length
    ? (solutions.reduce((s, sol) => s + (sol.lu40_effort?.effort_val || 0), 0) / solutions.length).toFixed(1)
    : '—'
  const avgReward = solutions.length
    ? (solutions.reduce((s, sol) => s + (sol.lu40_reward?.reward_val || 0), 0) / solutions.length).toFixed(1)
    : '—'

  // Overdue milestones
  const now = new Date()
  const overdueItems = problems
    .map(p => {
      const code = p.currentStatus?.phase_code
      const milestone = REVIEW_MILESTONES[code]
      if (!milestone) return null
      const ts = new Date(p.currentStatus?.timestamp)
      const dueDate = new Date(ts.getTime() + milestone.weeks * 7 * 24 * 60 * 60 * 1000)
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
      if (daysOverdue <= 0) return null
      return { problem: p, code, milestone, daysOverdue, dueDate }
    })
    .filter(Boolean)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)

  // CSV Export
  function handleExportCSV() {
    const rows = [
      ['Code', 'Title', 'Type', 'Location', 'Status', 'Phase Name', 'Created'],
      ...problems.map(p => [
        p.prob_code,
        p.title || '',
        p.prob_type || '',
        p.lu30_location?.loc_name || '',
        p.currentStatus?.phase_code || '',
        p.currentStatus?.phase_name || '',
        new Date(p.created_at).toLocaleDateString(),
      ]),
    ]
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `problems-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loadingProblems || loadingSolutions) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading reports...</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Summary statistics and analysis</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Problems', value: problems.length, color: 'blue' },
          { label: 'Total Solutions', value: solutions.length, color: 'indigo' },
          { label: 'Overdue Reviews', value: overdueItems.length, color: overdueItems.length > 0 ? 'red' : 'green' },
          { label: 'Avg Cost Score', value: avgCost, color: 'gray' },
        ].map(({ label, value, color }) => {
          const colorMap = {
            blue: 'bg-blue-50 text-blue-700 border-blue-200',
            indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            red: 'bg-red-50 text-red-700 border-red-200',
            green: 'bg-green-50 text-green-700 border-green-200',
            gray: 'bg-gray-50 text-gray-700 border-gray-200',
          }
          return (
            <div key={label} className={`rounded-xl border p-4 ${colorMap[color]}`}>
              <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          )
        })}
      </div>

      {/* Overdue section */}
      {overdueItems.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">
              Overdue Milestone Reviews ({overdueItems.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Phase</th>
                  <th className="px-4 py-3 text-left">Milestone</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-4 py-3 text-left">Days Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdueItems.map(({ problem: p, code, milestone, daysOverdue, dueDate }) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.prob_code}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{p.title || 'Untitled'}</td>
                    <td className="px-4 py-2.5"><StatusBadge code={code} /></td>
                    <td className="px-4 py-2.5 text-gray-600">{milestone.label} review</td>
                    <td className="px-4 py-2.5 text-gray-600">{dueDate.toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-red-600 font-semibold">{daysOverdue} days</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary tables grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SummaryTable
          title="Problems by Type"
          cols={['Type', 'Count', '%']}
          data={byTypeRows}
          emptyMsg="No problems recorded"
        />
        <SummaryTable
          title="Problems by Location"
          cols={['Location', 'Count']}
          data={byLocationRows}
          emptyMsg="No location data"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SummaryTable
          title="Problems by Phase"
          cols={['Phase', 'Count']}
          data={byPhaseRows}
          emptyMsg="No problems recorded"
        />
        <SummaryTable
          title="Solutions by Phase"
          cols={['Phase', 'Count']}
          data={solByPhaseRows}
          emptyMsg="No solutions recorded"
        />
      </div>

      {/* Solutions summary panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Solutions Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Solutions', value: solutions.length },
            { label: 'Avg Cost Score', value: `${avgCost} / 7` },
            { label: 'Avg Effort Score', value: `${avgEffort} / 5` },
            { label: 'Avg Reward Score', value: `${avgReward} / 5` },
            { label: 'Solutions in Progress', value: solutions.filter(s => !['S70', 'S59'].includes(s.currentStatus?.phase_code)).length },
            { label: 'Completed Solutions', value: solutions.filter(s => s.currentStatus?.phase_code === 'S70').length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Full problem list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Full Problem List</h3>
          <span className="text-xs text-gray-400">{problems.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {problems.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.prob_code}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{p.title || '—'}</td>
                  <td className="px-4 py-2.5">
                    {p.prob_type && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p.prob_type}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{p.lu30_location?.loc_name || '—'}</td>
                  <td className="px-4 py-2.5"><StatusBadge code={p.currentStatus?.phase_code} /></td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {problems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No problems recorded</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

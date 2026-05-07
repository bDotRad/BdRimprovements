import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import StatusBadge from '../../components/StatusBadge'
import { PROBLEM_PHASES, PROB_TYPES } from '../../constants/workflow'

export default function ProblemList() {
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { data: problems = [], isLoading } = useQuery({
    queryKey: ['problems-list'],
    queryFn: async () => {
      const [{ data: probs, error }, { data: statuses }, { data: sols }] = await Promise.all([
        supabase.from('t00_problems').select('id, prob_code, title, prob_type, created_at, lu30_location(loc_name)').order('created_at', { ascending: false }),
        supabase.from('v_problem_current_status').select('t00_problems_id, phase_code, phase_name'),
        supabase.from('t02_solutions').select('t00_problems_id'),
      ])
      if (error) throw error
      const statusMap = Object.fromEntries((statuses || []).map(s => [s.t00_problems_id, s]))
      const solCounts = (sols || []).reduce((acc, s) => { acc[s.t00_problems_id] = (acc[s.t00_problems_id] || 0) + 1; return acc }, {})
      return (probs || []).map(p => ({ ...p, currentStatus: statusMap[p.id] || null, solutionCount: solCounts[p.id] || 0 }))
    },
  })

  const filtered = problems.filter(p => {
    const matchSearch = !search ||
      p.prob_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.title?.toLowerCase().includes(search.toLowerCase())
    const matchPhase = !phaseFilter || p.currentStatus?.phase_code === phaseFilter
    const matchType = !typeFilter || p.prob_type === typeFilter
    return matchSearch && matchPhase && matchType
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Problems</h2>
        <Link
          to="/problems/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Problem
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {PROB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={phaseFilter}
          onChange={e => setPhaseFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Phases</option>
          {Object.entries(PROBLEM_PHASES).map(([code, p]) => (
            <option key={code} value={code}>{code} — {p.name}</option>
          ))}
        </select>
        {(search || phaseFilter || typeFilter) && (
          <button
            onClick={() => { setSearch(''); setPhaseFilter(''); setTypeFilter('') }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-gray-500">
          Showing {filtered.length} of {problems.length} problems
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Code</th>
                  <th className="px-5 py-3 text-left">Title</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Location</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-center">Solutions</th>
                  <th className="px-5 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{p.prob_code}</td>
                    <td className="px-5 py-3">
                      <Link to={`/problems/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {p.title || <span className="italic text-gray-400">Untitled</span>}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {p.prob_type && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {p.prob_type}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {p.lu30_location?.loc_name || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge code={p.currentStatus?.phase_code} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                        {p.solutionCount}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                      No problems match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

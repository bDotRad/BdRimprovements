import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, Edit, Plus, FileText, ExternalLink,
  AlertTriangle, CheckCircle, Users, ArrowRight
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAudit } from '../../hooks/useAudit'
import StatusBadge from '../../components/StatusBadge'
import WorkflowStepper from '../../components/WorkflowStepper'
import ImageGallery from '../../components/ImageGallery'
import AuditLog from '../../components/AuditLog'
import { PROBLEM_TRANSITIONS, TERMINAL_PHASES, SOLUTION_PHASES } from '../../constants/workflow'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'

const TABS = ['Overview', 'Solutions', 'Images', 'Risk & Details', 'History']

export default function ProblemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { logChange } = useAudit()

  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    return TABS.includes(tab) ? tab : 'Overview'
  })
  const [transitioning, setTransitioning] = useState(false)
  const [transitionComment, setTransitionComment] = useState('')
  const [selectedApprover, setSelectedApprover] = useState('')

  // Main problem query
  const { data: problem, isLoading, refetch } = useQuery({
    queryKey: ['problem', id],
    queryFn: async () => {
      const [{ data, error }, { data: statusRows }] = await Promise.all([
        supabase.from('t00_problems').select('*, lu30_location(id, loc_name), lu31_sub_location(id, subloc_name), lu40_equipment(id, name)').eq('id', id).single(),
        supabase.from('v_problem_current_status').select('*').eq('t00_problems_id', id).maybeSingle(),
      ])
      if (error) throw error
      return { ...data, currentStatus: statusRows || null }
    },
    enabled: !!id,
  })

  // Solutions query
  const { data: solutions = [], refetch: refetchSolutions } = useQuery({
    queryKey: ['problem-solutions', id],
    queryFn: async () => {
      const { data: sols, error } = await supabase
        .from('t02_solutions')
        .select('id, sol_num, title, descr, created_at, lu40_cost(cost_name), lu40_effort(effort_name), lu40_reward(reward_name)')
        .eq('t00_problems_id', id)
        .order('sol_num')
      if (error) throw error
      if (!sols || sols.length === 0) return []
      const solIds = sols.map(s => s.id)
      const { data: statuses } = await supabase.from('v_solution_current_status').select('*').in('t02_solutions_id', solIds)
      const statusMap = Object.fromEntries((statuses || []).map(s => [s.t02_solutions_id, s]))
      return sols.map(s => ({ ...s, currentStatus: statusMap[s.id] || null }))
    },
    enabled: !!id,
  })

  // Images query
  const { data: images = [], refetch: refetchImages } = useQuery({
    queryKey: ['problem-images', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t_images')
        .select('*')
        .eq('t00_problems_id', id)
        .order('image_number')
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  // Roles query
  const { data: roles = [] } = useQuery({
    queryKey: ['problem-roles', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lu20_prob_roles')
        .select(`
          id,
          lu21_people(first, last, email),
          lu21_roles(role, role_desc)
        `)
        .eq('t00_problems_id', id)
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  // Problem sources
  const { data: problemSources = [] } = useQuery({
    queryKey: ['problem-sources', id],
    queryFn: async () => {
      const { data } = await supabase.from('t_problem_sources').select('*').eq('t00_problems_id', id).order('created_at')
      return data || []
    },
    enabled: !!id,
  })

  // Risk details
  const { data: riskDetails = [] } = useQuery({
    queryKey: ['problem-risk', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lu60_risk')
        .select('*, lu61_consequence_lvl(cons_code, cons_name, cons_desc), lu61_likelihood(llh_code, llh_name, llh_desc)')
        .eq('t00_problems_id', id)
      return data || []
    },
    enabled: !!id,
  })

  const { data: complianceDetails = [] } = useQuery({
    queryKey: ['problem-compliance', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lu60_legal_compliance')
        .select('*, lu61_consequence_lvl(cons_code, cons_name), lu61_likelihood(llh_code, llh_name)')
        .eq('t00_problems_id', id)
      return data || []
    },
    enabled: !!id,
  })

  const { data: sustainabilityDetails = [] } = useQuery({
    queryKey: ['problem-sustainability', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lu60_sustainability')
        .select('*')
        .eq('t00_problems_id', id)
      return data || []
    },
    enabled: !!id,
  })

  const { data: improvementDetails = [] } = useQuery({
    queryKey: ['problem-improvement', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lu60_improvement')
        .select('*')
        .eq('t00_problems_id', id)
      return data || []
    },
    enabled: !!id,
  })

  // Status history
  const { data: statusHistory = [] } = useQuery({
    queryKey: ['problem-status-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lu10_problem_status')
        .select('*, lu11_problem_phase(code, name), lu21_people(first, last)')
        .eq('t00_problems_id', id)
        .order('timestamp', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  // People for approver gate
  const { data: approvers = [] } = useQuery({
    queryKey: ['approvers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lu21_people')
        .select('id, first, last')
        .eq('is_approver', true)
        .order('last')
      return data || []
    },
  })

  // Phase lookup
  const { data: phasesList = [] } = useQuery({
    queryKey: ['problem-phases'],
    queryFn: async () => {
      const { data } = await supabase.from('lu11_problem_phase').select('*')
      return data || []
    },
  })

  const currentPhase = problem?.currentStatus?.phase_code
  const transitions = PROBLEM_TRANSITIONS[currentPhase] || []
  const isTerminal = TERMINAL_PHASES.includes(currentPhase)

  // Check if all solutions are in terminal state (for P40 gate)
  const allSolutionsTerminal = solutions.length > 0 &&
    solutions.every(s => ['S70', 'S59'].includes(s.currentStatus?.phase_code))

  async function handleTransition(toCode) {
    const transition = transitions.find(t => t.to === toCode)
    if (!transition) return

    if (transition.requiresApprover && !selectedApprover) {
      toast.error('An approver must be selected for this transition')
      return
    }

    setTransitioning(true)
    try {
      const phase = phasesList.find(p => p.code === toCode)
      if (!phase) throw new Error(`Phase ${toCode} not found`)

      await supabase.from('lu10_problem_status').insert({
        t00_problems_id: id,
        lu11_problem_phase_id: phase.id,
        comm: transitionComment || transition.label,
        changed_by: selectedApprover || null,
      })

      await logChange({
        tableName: 't00_problems',
        recordId: id,
        fieldChanged: 'phase',
        valueBefore: currentPhase,
        valueAfter: toCode,
        actionDesc: `Status changed from ${currentPhase} to ${toCode}: ${transition.label}`,
        changedBy: selectedApprover || null,
      })

      toast.success(`Status advanced to ${toCode}`)
      setTransitionComment('')
      setSelectedApprover('')
      qc.invalidateQueries({ queryKey: ['problem', id] })
      qc.invalidateQueries({ queryKey: ['problem-status-history', id] })
      qc.invalidateQueries({ queryKey: ['dashboard-problems'] })
      qc.invalidateQueries({ queryKey: ['problems-list'] })
      refetch()
    } catch (err) {
      toast.error(err.message || 'Transition failed')
    } finally {
      setTransitioning(false)
    }
  }

  async function handleExportPDF() {
    if (!problem) return
    const doc = new jsPDF()
    let y = 20

    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text(`Problem Report`, 20, y)
    y += 10

    doc.setFontSize(12)
    doc.setFont(undefined, 'normal')
    doc.text(`Code: ${problem.prob_code}`, 20, y); y += 7
    doc.text(`Title: ${problem.title || 'Untitled'}`, 20, y); y += 7
    doc.text(`Type: ${problem.prob_type || 'N/A'}`, 20, y); y += 7
    doc.text(`Status: ${currentPhase || 'N/A'}`, 20, y); y += 7
    doc.text(`Location: ${problem.lu30_location?.loc_name || 'N/A'}`, 20, y); y += 7
    doc.text(`Sub-location: ${problem.lu31_sub_location?.subloc_name || 'N/A'}`, 20, y); y += 7
    doc.text(`Equipment: ${problem.lu40_equipment?.name || 'N/A'}`, 20, y); y += 7
    doc.text(`Created: ${new Date(problem.created_at).toLocaleString()}`, 20, y); y += 10

    if (problem.prob_statement) {
      doc.setFont(undefined, 'bold')
      doc.text('Problem Statement:', 20, y); y += 7
      doc.setFont(undefined, 'normal')
      const lines = doc.splitTextToSize(problem.prob_statement, 170)
      doc.text(lines, 20, y)
      y += lines.length * 7 + 5
    }

    if (solutions.length > 0) {
      doc.setFont(undefined, 'bold')
      doc.text('Solutions:', 20, y); y += 7
      doc.setFont(undefined, 'normal')
      solutions.forEach((s, i) => {
        doc.text(`${i + 1}. ${s.title || 'Untitled'} — ${s.currentStatus?.phase_code || 'N/A'}`, 25, y)
        y += 7
      })
    }

    doc.save(`${problem.prob_code}-report.pdf`)
    toast.success('PDF exported')
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading problem...</div>
  }
  if (!problem) {
    return <div className="text-center py-10 text-gray-500">Problem not found.</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/problems')} className="p-1.5 hover:bg-gray-100 rounded-lg mt-1">
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {problem.prob_code}
              </span>
              {problem.prob_type && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                  {problem.prob_type}
                </span>
              )}
              <StatusBadge code={currentPhase} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">
              {problem.title || <span className="italic text-gray-400">Untitled Problem</span>}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-4 w-4" /> PDF
          </button>
          <Link
            to={`/problems/${id}/edit`}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="h-4 w-4" /> Edit
          </Link>
        </div>
      </div>

      {/* Workflow stepper */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Workflow Progress</h3>
        <WorkflowStepper currentCode={currentPhase} type="problem" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab}
                {tab === 'Solutions' && (
                  <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                    {solutions.length}
                  </span>
                )}
                {tab === 'Images' && (
                  <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                    {images.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Problem Code', value: problem.prob_code },
                  { label: 'Problem Type', value: problem.prob_type || '—' },
                  { label: 'Problem Source', value: problem.prob_source || '—' },
                  { label: 'Raised By', value: problem.raised_by_name || '—' },
                  { label: 'Location', value: problem.lu30_location?.loc_name || '—' },
                  { label: 'Sub-location', value: problem.lu31_sub_location?.subloc_name || '—' },
                  { label: 'Equipment', value: problem.lu40_equipment?.name || '—' },
                  { label: 'Created', value: new Date(problem.created_at).toLocaleString() },
                  { label: 'Current Status', value: `${currentPhase} — ${problem.currentStatus?.phase_name || ''}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-gray-900">{value}</p>
                  </div>
                ))}
              </div>

              {/* Problem Sources */}
              {problemSources.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Problem Sources</p>
                  <div className="space-y-2">
                    {problemSources.map(s => (
                      <div key={s.id} className="flex flex-wrap items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">{s.source_type}</span>
                        {s.source_ref && <span className="text-xs text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">{s.source_ref}</span>}
                        {s.description && <span className="text-xs text-gray-500 mt-0.5 w-full">{s.description}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {problem.one_drive_link && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">OneDrive Link</p>
                  <a
                    href={problem.one_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open OneDrive
                  </a>
                </div>
              )}

              {problem.prob_statement && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Problem Statement</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                    {problem.prob_statement}
                  </p>
                </div>
              )}

              {/* Assigned Roles */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Assigned Roles
                </p>
                {roles.length === 0 ? (
                  <p className="text-sm text-gray-400">No roles assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {roles.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <span className="text-xs font-medium bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          {r.lu21_roles?.role}
                        </span>
                        <span className="text-sm text-gray-800">
                          {r.lu21_people?.first} {r.lu21_people?.last}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">{r.lu21_people?.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Solutions Tab */}
          {activeTab === 'Solutions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{solutions.length} solution(s) linked to this problem</p>
                {currentPhase === 'P30' && (
                  <Link
                    to={`/solutions/new/${id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Solution
                  </Link>
                )}
              </div>

              {currentPhase !== 'P30' && !['P40', 'P50', 'P19'].includes(currentPhase) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  Problem must be in P30 (Develop Solutions) phase to add solutions.
                </div>
              )}

              {currentPhase === 'P40' && !allSolutionsTerminal && solutions.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
                  Not all solutions are in a terminal state. Ensure all solutions are S70 or S59 before closing the problem.
                </div>
              )}

              {solutions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm">No solutions yet.</p>
                  {currentPhase === 'P30' && (
                    <Link to={`/solutions/new/${id}`} className="text-blue-600 text-sm hover:underline mt-1 block">
                      Add the first solution
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Title</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Cost</th>
                        <th className="px-4 py-3 text-left">Effort</th>
                        <th className="px-4 py-3 text-left">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {solutions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{s.sol_num}</td>
                          <td className="px-4 py-3">
                            <Link to={`/solutions/${s.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                              {s.title || 'Untitled Solution'}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge code={s.currentStatus?.phase_code} />
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{s.lu40_cost?.cost_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{s.lu40_effort?.effort_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'Images' && (
            <ImageGallery
              images={images}
              onRefresh={refetchImages}
              parentId={parseInt(id)}
              parentType="problem"
            />
          )}

          {/* Risk & Details Tab */}
          {activeTab === 'Risk & Details' && (
            <div className="space-y-6">
              {/* Risk */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Risk Assessment</h4>
                {riskDetails.length === 0 ? (
                  <p className="text-sm text-gray-400">No risk details recorded.</p>
                ) : (
                  riskDetails.map(r => (
                    <div key={r.id} className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs font-medium text-gray-500">Consequence</span>
                          <p className="text-gray-800">{r.lu61_consequence_lvl?.cons_name || '—'} ({r.lu61_consequence_lvl?.cons_code})</p>
                          {r.lu61_consequence_lvl?.cons_desc && <p className="text-xs text-gray-500">{r.lu61_consequence_lvl.cons_desc}</p>}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Likelihood</span>
                          <p className="text-gray-800">{r.lu61_likelihood?.llh_name || '—'} ({r.lu61_likelihood?.llh_code})</p>
                          {r.lu61_likelihood?.llh_desc && <p className="text-xs text-gray-500">{r.lu61_likelihood.llh_desc}</p>}
                        </div>
                      </div>
                      {r.description && <p className="text-sm text-gray-700 mt-2">{r.description}</p>}
                      {r.attachments && <p className="text-xs text-gray-500">Attachments: {r.attachments}</p>}
                    </div>
                  ))
                )}
              </div>

              {/* Legal Compliance */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Legal Compliance</h4>
                {complianceDetails.length === 0 ? (
                  <p className="text-sm text-gray-400">No compliance details recorded.</p>
                ) : (
                  complianceDetails.map(c => (
                    <div key={c.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs font-medium text-gray-500">Consequence</span>
                          <p className="text-gray-800">{c.lu61_consequence_lvl?.cons_name || '—'}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Likelihood</span>
                          <p className="text-gray-800">{c.lu61_likelihood?.llh_name || '—'}</p>
                        </div>
                      </div>
                      {c.description && <p className="text-sm text-gray-700">{c.description}</p>}
                    </div>
                  ))
                )}
              </div>

              {/* Sustainability */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Sustainability</h4>
                {sustainabilityDetails.length === 0 ? (
                  <p className="text-sm text-gray-400">No sustainability details recorded.</p>
                ) : (
                  sustainabilityDetails.map(s => (
                    <div key={s.id} className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                      {s.description && <p className="text-sm text-gray-700">{s.description}</p>}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        {[
                          { label: 'Current Cost (K)', value: s.costk_curr },
                          { label: 'Est. Cost (K)', value: s.costk_est },
                          { label: 'Current Time (h)', value: s.timeh_curr },
                          { label: 'Est. Time (h)', value: s.timeh_est },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-white rounded p-2">
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="font-semibold">{value ?? '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Improvement */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Improvement Details</h4>
                {improvementDetails.length === 0 ? (
                  <p className="text-sm text-gray-400">No improvement details recorded.</p>
                ) : (
                  improvementDetails.map(i => (
                    <div key={i.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      {i.imp_det && <p className="text-sm text-gray-700">{i.imp_det}</p>}
                      {i.attachments && <p className="text-xs text-gray-500 mt-2">Attachments: {i.attachments}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'History' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Status Change History</h4>
                {statusHistory.length === 0 ? (
                  <p className="text-sm text-gray-400">No status history.</p>
                ) : (
                  <div className="space-y-2">
                    {statusHistory.map((sh, idx) => (
                      <div key={sh.id} className={`flex items-start gap-3 p-3 rounded-lg ${idx === 0 ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} style={{ marginTop: '0.4rem' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge code={sh.lu11_problem_phase?.code} />
                            {idx === 0 && <span className="text-xs text-blue-600 font-medium">Current</span>}
                          </div>
                          {sh.comm && <p className="text-sm text-gray-700 mt-1">{sh.comm}</p>}
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span>{new Date(sh.timestamp).toLocaleString()}</span>
                            {sh.lu21_people && (
                              <span>by {sh.lu21_people.first} {sh.lu21_people.last}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Audit Log</h4>
                <AuditLog recordId={parseInt(id)} tableName="t00_problems" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advance Workflow — bottom of page */}
      {!isTerminal && transitions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" /> Advance Workflow
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">Comment (optional)</label>
              <textarea
                value={transitionComment}
                onChange={e => setTransitionComment(e.target.value)}
                rows={2}
                placeholder="Add a comment for this status change..."
                className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            {transitions.some(t => t.requiresApprover) && (
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  Approver (required for gated transitions)
                </label>
                <select
                  value={selectedApprover}
                  onChange={e => setSelectedApprover(e.target.value)}
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Select approver —</option>
                  {approvers.map(a => (
                    <option key={a.id} value={a.id}>{a.first} {a.last}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {transitions.map(t => {
                const isGated = t.requiresApprover
                return (
                  <button
                    key={t.to}
                    onClick={() => handleTransition(t.to)}
                    disabled={transitioning}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50
                      ${t.to === 'P19' || t.to === 'S59'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                        : isGated
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {isGated && <AlertTriangle className="h-3.5 w-3.5" />}
                    {t.label} ({t.to})
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isTerminal && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-500">
            This problem is in a terminal state ({currentPhase}) and no further transitions are available.
          </p>
        </div>
      )}
    </div>
  )
}

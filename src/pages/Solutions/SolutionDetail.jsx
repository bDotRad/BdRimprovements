import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, Edit, ExternalLink, AlertTriangle,
  CheckCircle, Users, ArrowRight, DollarSign
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAudit } from '../../hooks/useAudit'
import StatusBadge from '../../components/StatusBadge'
import WorkflowStepper from '../../components/WorkflowStepper'
import ImageGallery from '../../components/ImageGallery'
import AuditLog from '../../components/AuditLog'
import { SOLUTION_TRANSITIONS, TERMINAL_PHASES } from '../../constants/workflow'
import toast from 'react-hot-toast'

const TABS = ['Overview', 'Images', 'History']

export default function SolutionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { logChange } = useAudit()

  const [activeTab, setActiveTab] = useState('Overview')
  const [transitioning, setTransitioning] = useState(false)
  const [transitionComment, setTransitionComment] = useState('')
  const [selectedApprover, setSelectedApprover] = useState('')

  const { data: solution, isLoading, refetch } = useQuery({
    queryKey: ['solution', id],
    queryFn: async () => {
      const [{ data, error }, { data: statusRow }] = await Promise.all([
        supabase.from('t02_solutions').select('*, t00_problems(id, prob_code, title), lu40_cost(cost_name, cost_val), lu40_effort(effort_name, effort_val), lu40_reward(reward_name, reward_val)').eq('id', id).single(),
        supabase.from('v_solution_current_status').select('*').eq('t02_solutions_id', id).maybeSingle(),
      ])
      if (error) throw error
      return { ...data, currentStatus: statusRow || null }
    },
    enabled: !!id,
  })

  const { data: images = [], refetch: refetchImages } = useQuery({
    queryKey: ['solution-images', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t_images')
        .select('*')
        .eq('t02_solutions_id', id)
        .order('image_number')
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['solution-roles', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lu20_sol_roles')
        .select(`
          id,
          lu21_people(first, last, email),
          lu21_roles(role, role_desc)
        `)
        .eq('t02_solutions_id', id)
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  const { data: statusHistory = [] } = useQuery({
    queryKey: ['solution-status-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lu10_solution_status')
        .select('*, lu11_solution_phase(code, name), lu21_people(first, last)')
        .eq('t02_solutions_id', id)
        .order('timestamp', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  const { data: solutionPhases = [] } = useQuery({
    queryKey: ['solution-phases'],
    queryFn: async () => {
      const { data } = await supabase.from('lu11_solution_phase').select('*')
      return data || []
    },
  })

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

  const currentPhase = solution?.currentStatus?.phase_code
  const transitions = SOLUTION_TRANSITIONS[currentPhase] || []
  const isTerminal = TERMINAL_PHASES.includes(currentPhase)

  async function handleTransition(toCode) {
    const transition = transitions.find(t => t.to === toCode)
    if (!transition) return

    if (transition.requiresApprover && !selectedApprover) {
      toast.error('An approver must be selected for this transition')
      return
    }

    setTransitioning(true)
    try {
      const phase = solutionPhases.find(p => p.code === toCode)
      if (!phase) throw new Error(`Phase ${toCode} not found`)

      await supabase.from('lu10_solution_status').insert({
        t02_solutions_id: id,
        lu11_solution_phase_id: phase.id,
        comm: transitionComment || transition.label,
        changed_by: selectedApprover || null,
      })

      await logChange({
        tableName: 't02_solutions',
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
      qc.invalidateQueries({ queryKey: ['solution', id] })
      qc.invalidateQueries({ queryKey: ['solution-status-history', id] })
      if (solution?.t00_problems?.id) {
        qc.invalidateQueries({ queryKey: ['problem-solutions', String(solution.t00_problems.id)] })
      }
      refetch()
    } catch (err) {
      toast.error(err.message || 'Transition failed')
    } finally {
      setTransitioning(false)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading solution...</div>
  }
  if (!solution) {
    return <div className="text-center py-10 text-gray-500">Solution not found.</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => solution?.t00_problems?.id
              ? navigate(`/problems/${solution.t00_problems.id}`)
              : navigate(-1)
            }
            className="p-1.5 hover:bg-gray-100 rounded-lg mt-1"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {solution.t00_problems && (
                <Link
                  to={`/problems/${solution.t00_problems.id}`}
                  className="font-mono text-sm text-blue-600 hover:underline"
                >
                  {solution.t00_problems.prob_code}
                </Link>
              )}
              <span className="text-gray-400">/</span>
              <span className="text-sm text-gray-500">Solution {solution.sol_num}</span>
              <StatusBadge code={currentPhase} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">
              {solution.title || <span className="italic text-gray-400">Untitled Solution</span>}
            </h2>
            {solution.t00_problems && (
              <p className="text-sm text-gray-500 mt-0.5">
                Problem: {solution.t00_problems.title}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/problems/${solution.t00_problems?.id}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Problem
          </Link>
          <Link
            to={`/solutions/${id}/edit`}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="h-4 w-4" /> Edit
          </Link>
        </div>
      </div>

      {/* Workflow stepper */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Solution Workflow Progress</h3>
        <WorkflowStepper currentCode={currentPhase} type="solution" />
      </div>

      {/* Workflow advance panel */}
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
                      ${t.to === 'S59'
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
            This solution is in a terminal state ({currentPhase}) and cannot be advanced further.
          </p>
        </div>
      )}

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
              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Solution #', value: solution.sol_num },
                  { label: 'Cost Estimate', value: solution.lu40_cost?.cost_name || '—' },
                  { label: 'Effort Estimate', value: solution.lu40_effort?.effort_name || '—' },
                  { label: 'Reward / Benefit', value: solution.lu40_reward?.reward_name || '—' },
                  { label: 'Design Budget ($K)', value: solution.design_bud_k != null ? `$${solution.design_bud_k}K` : '—' },
                  { label: 'Exec Budget ($K)', value: solution.exec_bud_k != null ? `$${solution.exec_bud_k}K` : '—' },
                  { label: 'MoC Number', value: solution.moc || '—' },
                  { label: 'Created', value: new Date(solution.created_at).toLocaleDateString() },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-900">{String(value)}</p>
                  </div>
                ))}
              </div>

              {solution.one_drive_link && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">OneDrive Link</p>
                  <a
                    href={solution.one_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" /> Open OneDrive
                  </a>
                </div>
              )}

              {solution.descr && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                    {solution.descr}
                  </p>
                </div>
              )}

              {/* Budget summary */}
              {(solution.design_bud_k || solution.exec_bud_k) && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Budget Summary
                  </p>
                  <div className="flex gap-6 text-sm">
                    {solution.design_bud_k && (
                      <div>
                        <span className="text-blue-600 text-xs font-medium">Design</span>
                        <p className="font-bold text-blue-900">${solution.design_bud_k}K</p>
                      </div>
                    )}
                    {solution.exec_bud_k && (
                      <div>
                        <span className="text-blue-600 text-xs font-medium">Execution</span>
                        <p className="font-bold text-blue-900">${solution.exec_bud_k}K</p>
                      </div>
                    )}
                    {solution.design_bud_k && solution.exec_bud_k && (
                      <div className="border-l border-blue-200 pl-6">
                        <span className="text-blue-600 text-xs font-medium">Total</span>
                        <p className="font-bold text-blue-900">${solution.design_bud_k + solution.exec_bud_k}K</p>
                      </div>
                    )}
                  </div>
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

          {/* Images Tab */}
          {activeTab === 'Images' && (
            <ImageGallery
              images={images}
              onRefresh={refetchImages}
              parentId={parseInt(id)}
              parentType="solution"
            />
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
                      <div
                        key={sh.id}
                        className={`flex items-start gap-3 p-3 rounded-lg ${idx === 0 ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}
                      >
                        <div
                          className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                          style={{ marginTop: '0.4rem' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge code={sh.lu11_solution_phase?.code} />
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
                <AuditLog recordId={parseInt(id)} tableName="t02_solutions" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAudit } from '../../hooks/useAudit'
import toast from 'react-hot-toast'

export default function SolutionForm() {
  const { id, problemId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { logChange } = useAudit()
  const isEdit = !!id

  const [form, setForm] = useState({
    title: '',
    descr: '',
    lu40_cost_id: '',
    lu40_effort_id: '',
    lu40_reward_id: '',
    design_bud_k: '',
    exec_bud_k: '',
    moc: '',
    one_drive_link: '',
  })
  const [saving, setSaving] = useState(false)

  // Load lookup tables
  const { data: costs = [] } = useQuery({
    queryKey: ['costs'],
    queryFn: async () => {
      const { data } = await supabase.from('lu40_cost').select('*').order('cost_val')
      return data || []
    },
  })

  const { data: efforts = [] } = useQuery({
    queryKey: ['efforts'],
    queryFn: async () => {
      const { data } = await supabase.from('lu40_effort').select('*').order('effort_val')
      return data || []
    },
  })

  const { data: rewards = [] } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const { data } = await supabase.from('lu40_reward').select('*').order('reward_val')
      return data || []
    },
  })

  const { data: solutionPhases = [] } = useQuery({
    queryKey: ['solution-phases'],
    queryFn: async () => {
      const { data } = await supabase.from('lu11_solution_phase').select('*').order('sort_order')
      return data || []
    },
  })

  // Load problem info for display
  const { data: problem } = useQuery({
    queryKey: ['problem', problemId],
    queryFn: async () => {
      const { data } = await supabase
        .from('t00_problems')
        .select('id, prob_code, title')
        .eq('id', problemId)
        .single()
      return data
    },
    enabled: !!problemId && !isEdit,
  })

  // Load existing solution if editing
  const { data: existing } = useQuery({
    queryKey: ['solution', id],
    queryFn: async () => {
      const { data } = await supabase.from('t02_solutions').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title || '',
        descr: existing.descr || '',
        lu40_cost_id: existing.lu40_cost_id || '',
        lu40_effort_id: existing.lu40_effort_id || '',
        lu40_reward_id: existing.lu40_reward_id || '',
        design_bud_k: existing.design_bud_k || '',
        exec_bud_k: existing.exec_bud_k || '',
        moc: existing.moc || '',
        one_drive_link: existing.one_drive_link || '',
      })
    }
  }, [existing])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('t02_solutions')
          .update({
            title: form.title,
            descr: form.descr || null,
            lu40_cost_id: form.lu40_cost_id || null,
            lu40_effort_id: form.lu40_effort_id || null,
            lu40_reward_id: form.lu40_reward_id || null,
            design_bud_k: form.design_bud_k ? parseInt(form.design_bud_k) : null,
            exec_bud_k: form.exec_bud_k ? parseInt(form.exec_bud_k) : null,
            moc: form.moc ? parseInt(form.moc) : null,
            one_drive_link: form.one_drive_link || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
        if (error) throw error

        await logChange({
          tableName: 't02_solutions',
          recordId: id,
          actionDesc: 'Solution details updated',
        })
        toast.success('Solution updated')
        qc.invalidateQueries({ queryKey: ['solution', id] })
        navigate(`/solutions/${id}`)
      } else {
        // Count existing solutions for this problem
        const { count } = await supabase
          .from('t02_solutions')
          .select('*', { count: 'exact', head: true })
          .eq('t00_problems_id', problemId)

        const solNum = (count || 0) + 1

        const { data: newSol, error } = await supabase
          .from('t02_solutions')
          .insert({
            t00_problems_id: parseInt(problemId),
            sol_num: solNum,
            title: form.title,
            descr: form.descr || null,
            lu40_cost_id: form.lu40_cost_id || null,
            lu40_effort_id: form.lu40_effort_id || null,
            lu40_reward_id: form.lu40_reward_id || null,
            design_bud_k: form.design_bud_k ? parseInt(form.design_bud_k) : null,
            exec_bud_k: form.exec_bud_k ? parseInt(form.exec_bud_k) : null,
            moc: form.moc ? parseInt(form.moc) : null,
            one_drive_link: form.one_drive_link || null,
          })
          .select()
          .single()
        if (error) throw error

        // Create initial S10 status
        const s10 = solutionPhases.find(p => p.code === 'S10')
        if (s10) {
          await supabase.from('lu10_solution_status').insert({
            t02_solutions_id: newSol.id,
            lu11_solution_phase_id: s10.id,
            comm: 'Solution created',
          })
        }

        await logChange({
          tableName: 't02_solutions',
          recordId: newSol.id,
          actionDesc: `Solution ${solNum} created for problem ${problemId}`,
        })

        toast.success('Solution created')
        qc.invalidateQueries({ queryKey: ['problem-solutions', problemId] })
        navigate(`/solutions/${newSol.id}`)
      }
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  const activeProblemId = isEdit ? existing?.t00_problems_id : problemId

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Solution' : 'New Solution'}</h2>
          {problem && (
            <p className="text-sm text-gray-500 mt-0.5">
              for problem <span className="font-mono font-medium">{problem.prob_code}</span> — {problem.title}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className={labelCls}>Solution Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className={inputCls}
            placeholder="Brief title for this solution"
            required
          />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={form.descr}
            onChange={e => setForm(f => ({ ...f, descr: e.target.value }))}
            rows={4}
            className={inputCls}
            placeholder="Describe the solution approach..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Cost Estimate</label>
            <select
              value={form.lu40_cost_id}
              onChange={e => setForm(f => ({ ...f, lu40_cost_id: e.target.value }))}
              className={inputCls}
            >
              <option value="">— Select —</option>
              {costs.map(c => <option key={c.id} value={c.id}>{c.cost_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Effort Estimate</label>
            <select
              value={form.lu40_effort_id}
              onChange={e => setForm(f => ({ ...f, lu40_effort_id: e.target.value }))}
              className={inputCls}
            >
              <option value="">— Select —</option>
              {efforts.map(e => <option key={e.id} value={e.id}>{e.effort_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reward / Benefit</label>
            <select
              value={form.lu40_reward_id}
              onChange={e => setForm(f => ({ ...f, lu40_reward_id: e.target.value }))}
              className={inputCls}
            >
              <option value="">— Select —</option>
              {rewards.map(r => <option key={r.id} value={r.id}>{r.reward_name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Design Budget ($K)</label>
            <input
              type="number"
              value={form.design_bud_k}
              onChange={e => setForm(f => ({ ...f, design_bud_k: e.target.value }))}
              className={inputCls}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className={labelCls}>Execution Budget ($K)</label>
            <input
              type="number"
              value={form.exec_bud_k}
              onChange={e => setForm(f => ({ ...f, exec_bud_k: e.target.value }))}
              className={inputCls}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className={labelCls}>MoC Number</label>
            <input
              type="number"
              value={form.moc}
              onChange={e => setForm(f => ({ ...f, moc: e.target.value }))}
              className={inputCls}
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>OneDrive Link</label>
          <input
            type="url"
            value={form.one_drive_link}
            onChange={e => setForm(f => ({ ...f, one_drive_link: e.target.value }))}
            className={inputCls}
            placeholder="https://..."
          />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Solution'}
          </button>
        </div>
      </form>
    </div>
  )
}

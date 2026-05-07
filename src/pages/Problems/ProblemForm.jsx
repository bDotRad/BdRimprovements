import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAudit } from '../../hooks/useAudit'
import { PROB_TYPES } from '../../constants/workflow'
import toast from 'react-hot-toast'

export default function ProblemForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { logChange } = useAudit()
  const isEdit = !!id

  const [form, setForm] = useState({
    title: '',
    prob_type: '',
    prob_statement: '',
    lu30_location_id: '',
    lu31_sub_location_id: '',
    lu40_equipment_id: '',
    one_drive_link: '',
    raised_by: '',
  })
  const [saving, setSaving] = useState(false)

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await supabase.from('lu30_location').select('*').order('loc_name')
      return data || []
    },
  })

  const { data: subLocations = [] } = useQuery({
    queryKey: ['sublocations', form.lu30_location_id],
    queryFn: async () => {
      if (!form.lu30_location_id) return []
      const { data } = await supabase
        .from('lu31_sub_location')
        .select('*')
        .eq('lu30_location_id', form.lu30_location_id)
        .order('subloc_name')
      return data || []
    },
    enabled: !!form.lu30_location_id,
  })

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data } = await supabase.from('lu40_equipment').select('*').order('name')
      return data || []
    },
  })

  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const { data } = await supabase.from('lu21_people').select('id, first, last').order('last')
      return data || []
    },
  })

  const { data: phases = [] } = useQuery({
    queryKey: ['problem-phases'],
    queryFn: async () => {
      const { data } = await supabase.from('lu11_problem_phase').select('*').order('sort_order')
      return data || []
    },
  })

  const { data: existing } = useQuery({
    queryKey: ['problem', id],
    queryFn: async () => {
      const { data } = await supabase.from('t00_problems').select('*').eq('id', id).single()
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title || '',
        prob_type: existing.prob_type || '',
        prob_statement: existing.prob_statement || '',
        lu30_location_id: existing.lu30_location_id || '',
        lu31_sub_location_id: existing.lu31_sub_location_id || '',
        lu40_equipment_id: existing.lu40_equipment_id || '',
        one_drive_link: existing.one_drive_link || '',
        raised_by: '',
      })
    }
  }, [existing])

  async function generateCode() {
    const yy = new Date().getFullYear().toString().slice(-2)
    const { data } = await supabase
      .from('t00_problems')
      .select('prob_code')
      .like('prob_code', `${yy}-%`)
    const nums = (data || [])
      .map(r => parseInt(r.prob_code.split('-')[1] || '0', 10))
      .filter(Boolean)
    const next = nums.length ? Math.max(...nums) + 1 : 1
    return `${yy}-${String(next).padStart(3, '0')}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        const updates = {
          title: form.title,
          prob_type: form.prob_type || null,
          prob_statement: form.prob_statement || null,
          lu30_location_id: form.lu30_location_id || null,
          lu31_sub_location_id: form.lu31_sub_location_id || null,
          lu40_equipment_id: form.lu40_equipment_id || null,
          one_drive_link: form.one_drive_link || null,
          updated_at: new Date().toISOString(),
        }
        const { error } = await supabase.from('t00_problems').update(updates).eq('id', id)
        if (error) throw error
        await logChange({
          tableName: 't00_problems',
          recordId: id,
          actionDesc: 'Problem details updated',
          changedBy: form.raised_by || null,
        })
        toast.success('Problem updated')
        qc.invalidateQueries({ queryKey: ['problem', id] })
        navigate(`/problems/${id}`)
      } else {
        const code = await generateCode()
        const { data: newProb, error } = await supabase
          .from('t00_problems')
          .insert({
            prob_code: code,
            title: form.title,
            prob_type: form.prob_type || null,
            prob_statement: form.prob_statement || null,
            lu30_location_id: form.lu30_location_id || null,
            lu31_sub_location_id: form.lu31_sub_location_id || null,
            lu40_equipment_id: form.lu40_equipment_id || null,
            one_drive_link: form.one_drive_link || null,
          })
          .select()
          .single()
        if (error) throw error

        const p00 = phases.find(p => p.code === 'P00')
        if (p00) {
          await supabase.from('lu10_problem_status').insert({
            t00_problems_id: newProb.id,
            lu11_problem_phase_id: p00.id,
            comm: 'Problem created',
            changed_by: form.raised_by || null,
          })
        }
        await logChange({
          tableName: 't00_problems',
          recordId: newProb.id,
          actionDesc: `Problem ${code} created`,
          changedBy: form.raised_by || null,
        })
        toast.success(`Problem ${code} created`)
        qc.invalidateQueries({ queryKey: ['problems-list'] })
        qc.invalidateQueries({ queryKey: ['dashboard-problems'] })
        navigate(`/problems/${newProb.id}`)
      }
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLocationChange = (e) => {
    setForm(f => ({ ...f, lu30_location_id: e.target.value, lu31_sub_location_id: '' }))
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Problem' : 'New Problem'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className={labelCls}>Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className={inputCls}
            placeholder="Brief title of the problem"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Problem Type</label>
            <select
              value={form.prob_type}
              onChange={e => setForm(f => ({ ...f, prob_type: e.target.value }))}
              className={inputCls}
            >
              <option value="">— Select type —</option>
              {PROB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Raised By</label>
            <select
              value={form.raised_by}
              onChange={e => setForm(f => ({ ...f, raised_by: e.target.value }))}
              className={inputCls}
            >
              <option value="">— Select person —</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.first} {p.last}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Problem Statement</label>
          <textarea
            value={form.prob_statement}
            onChange={e => setForm(f => ({ ...f, prob_statement: e.target.value }))}
            rows={4}
            className={inputCls}
            placeholder="Describe the problem clearly..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Location</label>
            <select
              value={form.lu30_location_id}
              onChange={handleLocationChange}
              className={inputCls}
            >
              <option value="">— Select location —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.loc_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Sub-location</label>
            <select
              value={form.lu31_sub_location_id}
              onChange={e => setForm(f => ({ ...f, lu31_sub_location_id: e.target.value }))}
              className={inputCls}
              disabled={!form.lu30_location_id}
            >
              <option value="">— Select sub-location —</option>
              {subLocations.map(s => <option key={s.id} value={s.id}>{s.subloc_name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Equipment</label>
          <select
            value={form.lu40_equipment_id}
            onChange={e => setForm(f => ({ ...f, lu40_equipment_id: e.target.value }))}
            className={inputCls}
          >
            <option value="">— Select equipment —</option>
            {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
          </select>
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
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Problem'}
          </button>
        </div>
      </form>
    </div>
  )
}

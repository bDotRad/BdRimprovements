import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Save, Plus, Trash2, CheckCircle, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAudit } from '../../hooks/useAudit'
import ImageGallery from '../../components/ImageGallery'
import toast from 'react-hot-toast'

// Source types and their optional reference ID label
const SOURCE_TYPES = {
  'Hazard':            { refLabel: 'Hazard ID' },
  'Incident':          { refLabel: 'Incident ID' },
  'EWR':               { refLabel: 'WO Number' },
  'Near Miss':         { refLabel: null },
  'Audit Finding':     { refLabel: 'Audit Ref' },
  'Management Review': { refLabel: null },
  'Operator Report':   { refLabel: null },
  'Inspection':        { refLabel: null },
  'Customer Complaint':{ refLabel: null },
  'Regulatory':        { refLabel: 'Regulation Ref' },
  'Other':             { refLabel: null },
}

function newSource() {
  return { _key: Date.now() + Math.random(), source_type: '', source_ref: '', description: '' }
}

export default function ProblemForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { logChange } = useAudit()
  const isEdit = !!id

  // Two-phase flow for new problems: 'form' → 'images'
  const [phase, setPhase] = useState('form')
  const [newProblemId, setNewProblemId] = useState(null)
  const [newProblemCode, setNewProblemCode] = useState('')

  const [form, setForm] = useState({
    title: '',
    raised_by_name: '',
    prob_statement: '',
    lu30_location_id: '',
    lu31_sub_location_id: '',
    lu40_equipment_id: '',
    one_drive_link: '',
  })
  const [sources, setSources] = useState([newSource()])
  const [saving, setSaving] = useState(false)

  // Queries
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => (await supabase.from('lu30_location').select('*').order('loc_name')).data || [],
  })

  const { data: subLocations = [] } = useQuery({
    queryKey: ['sublocations', form.lu30_location_id],
    queryFn: async () => {
      if (!form.lu30_location_id) return []
      return (await supabase.from('lu31_sub_location').select('*').eq('lu30_location_id', form.lu30_location_id).order('subloc_name')).data || []
    },
    enabled: !!form.lu30_location_id,
  })

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => (await supabase.from('lu40_equipment').select('*').order('name')).data || [],
  })

  const { data: phases = [] } = useQuery({
    queryKey: ['problem-phases'],
    queryFn: async () => (await supabase.from('lu11_problem_phase').select('*').order('sort_order')).data || [],
  })

  const { data: existing } = useQuery({
    queryKey: ['problem', id],
    queryFn: async () => (await supabase.from('t00_problems').select('*').eq('id', id).single()).data,
    enabled: isEdit,
  })

  const { data: existingSources = [] } = useQuery({
    queryKey: ['problem-sources', id],
    queryFn: async () => (await supabase.from('t_problem_sources').select('*').eq('t00_problems_id', id).order('created_at')).data || [],
    enabled: isEdit,
  })

  // Images for the post-create upload phase
  const { data: newProbImages = [], refetch: refetchNewImages } = useQuery({
    queryKey: ['new-problem-images', newProblemId],
    queryFn: async () => (await supabase.from('t_images').select('*').eq('t00_problems_id', newProblemId).order('image_number')).data || [],
    enabled: !!newProblemId,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title || '',
        raised_by_name: existing.raised_by_name || '',
        prob_statement: existing.prob_statement || '',
        lu30_location_id: existing.lu30_location_id || '',
        lu31_sub_location_id: existing.lu31_sub_location_id || '',
        lu40_equipment_id: existing.lu40_equipment_id || '',
        one_drive_link: existing.one_drive_link || '',
      })
    }
  }, [existing])

  useEffect(() => {
    if (existingSources.length > 0) {
      setSources(existingSources.map(s => ({ ...s, _key: s.id })))
    }
  }, [existingSources])

  // Source helpers
  const addSource = () => setSources(s => [...s, newSource()])
  const removeSource = (key) => setSources(s => s.filter(src => src._key !== key))
  const updateSource = (key, field, value) => setSources(s => s.map(src => src._key === key ? { ...src, [field]: value } : src))

  async function generateCode() {
    const yy = new Date().getFullYear().toString().slice(-2)
    const { data } = await supabase.from('t00_problems').select('prob_code').like('prob_code', `P${yy}-%`)
    const nums = (data || []).map(r => parseInt(r.prob_code.split('-')[1] || '0', 10)).filter(n => !isNaN(n))
    const next = nums.length ? Math.max(...nums) + 1 : 1
    return `P${yy}-${String(next).padStart(3, '0')}`
  }

  async function saveSources(problemId) {
    const valid = sources.filter(s => s.source_type)
    if (valid.length === 0) return
    await supabase.from('t_problem_sources').insert(
      valid.map(s => ({
        t00_problems_id: problemId,
        source_type: s.source_type,
        source_ref: s.source_ref || null,
        description: s.description || null,
      }))
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const fields = {
        title: form.title,
        raised_by_name: form.raised_by_name || null,
        prob_statement: form.prob_statement || null,
        lu30_location_id: form.lu30_location_id || null,
        lu31_sub_location_id: form.lu31_sub_location_id || null,
        lu40_equipment_id: form.lu40_equipment_id || null,
        one_drive_link: form.one_drive_link || null,
      }

      if (isEdit) {
        const { error } = await supabase.from('t00_problems').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
        // Replace sources
        await supabase.from('t_problem_sources').delete().eq('t00_problems_id', id)
        await saveSources(id)
        await logChange({ tableName: 't00_problems', recordId: id, actionDesc: 'Problem details updated' })
        toast.success('Problem updated')
        qc.invalidateQueries({ queryKey: ['problem', id] })
        qc.invalidateQueries({ queryKey: ['problem-sources', id] })
        navigate(`/problems/${id}`)
      } else {
        const code = await generateCode()
        const { data: newProb, error } = await supabase
          .from('t00_problems')
          .insert({ prob_code: code, ...fields })
          .select()
          .single()
        if (error) throw error

        const p00 = phases.find(p => p.code === 'P00')
        if (p00) {
          await supabase.from('lu10_problem_status').insert({
            t00_problems_id: newProb.id,
            lu11_problem_phase_id: p00.id,
            comm: `Problem created${form.raised_by_name ? ` by ${form.raised_by_name}` : ''}`,
          })
        }
        await saveSources(newProb.id)
        await logChange({ tableName: 't00_problems', recordId: newProb.id, actionDesc: `Problem ${code} created` })

        qc.invalidateQueries({ queryKey: ['problems-list'] })
        qc.invalidateQueries({ queryKey: ['dashboard-problems'] })

        setNewProblemId(newProb.id)
        setNewProblemCode(code)
        setPhase('images')
        toast.success(`Problem ${code} logged — add photos below`)
      }
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  // ── Image upload phase (after creation) ────────────────────────────────────
  if (phase === 'images') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4">
          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800 text-lg">Problem logged — {newProblemCode}</p>
            <p className="text-sm text-green-700 mt-0.5">Add photos below to support this report, then tap Done.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Photos</h3>
          <ImageGallery
            images={newProbImages}
            onRefresh={refetchNewImages}
            parentId={newProblemId}
            parentType="problem"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/problems/${newProblemId}`)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip — view problem details
          </button>
          <button
            onClick={() => navigate(`/problems/${newProblemId}`)}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Done <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // ── Entry form ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Problem' : 'Report a Problem'}</h2>
          {!isEdit && <p className="text-sm text-gray-500 mt-0.5">Fill in what you know — an engineer will follow up.</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Basic info ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className={labelCls}>What is the problem? *</label>
            <input type="text" value={form.title} onChange={set('title')} className={inputCls} placeholder="Brief title" required />
          </div>

          <div>
            <label className={labelCls}>Your name</label>
            <input type="text" value={form.raised_by_name} onChange={set('raised_by_name')} className={inputCls} placeholder="Who is reporting this?" />
          </div>

          <div>
            <label className={labelCls}>Describe the problem</label>
            <textarea value={form.prob_statement} onChange={set('prob_statement')} rows={4} className={inputCls} placeholder="What happened? Where? When? Any relevant details..." />
          </div>
        </div>

        {/* ── Problem Sources ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Problem Source</h3>
              <p className="text-xs text-gray-500 mt-0.5">What type of problem is this? You can add more than one.</p>
            </div>
            <button type="button" onClick={addSource} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="h-4 w-4" /> Add source
            </button>
          </div>

          <div className="space-y-4">
            {sources.map((src, idx) => {
              const typeInfo = SOURCE_TYPES[src.source_type]
              return (
                <div key={src._key} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Source type</label>
                      <select
                        value={src.source_type}
                        onChange={e => updateSource(src._key, 'source_type', e.target.value)}
                        className={inputCls}
                      >
                        <option value="">— Select type —</option>
                        {Object.keys(SOURCE_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    {sources.length > 1 && (
                      <button type="button" onClick={() => removeSource(src._key)} className="mt-5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {typeInfo?.refLabel && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{typeInfo.refLabel}</label>
                      <input
                        type="text"
                        value={src.source_ref}
                        onChange={e => updateSource(src._key, 'source_ref', e.target.value)}
                        className={inputCls}
                        placeholder={`Enter ${typeInfo.refLabel}...`}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Additional details (optional)</label>
                    <input
                      type="text"
                      value={src.description}
                      onChange={e => updateSource(src._key, 'description', e.target.value)}
                      className={inputCls}
                      placeholder="Any extra context for this source..."
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Location & Equipment ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Location & Equipment</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Location</label>
              <select
                value={form.lu30_location_id}
                onChange={e => setForm(f => ({ ...f, lu30_location_id: e.target.value, lu31_sub_location_id: '' }))}
                className={inputCls}
              >
                <option value="">— Select —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.loc_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sub-location</label>
              <select
                value={form.lu31_sub_location_id}
                onChange={set('lu31_sub_location_id')}
                className={inputCls}
                disabled={!form.lu30_location_id}
              >
                <option value="">— Select —</option>
                {subLocations.map(s => <option key={s.id} value={s.id}>{s.subloc_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Equipment involved</label>
            <select value={form.lu40_equipment_id} onChange={set('lu40_equipment_id')} className={inputCls}>
              <option value="">— Select equipment —</option>
              {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>OneDrive / Reference link</label>
            <input type="url" value={form.one_drive_link} onChange={set('one_drive_link')} className={inputCls} placeholder="https://..." />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pb-6">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Log Problem & Add Photos'}
          </button>
        </div>
      </form>
    </div>
  )
}

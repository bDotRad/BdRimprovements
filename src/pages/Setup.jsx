import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Plus, Trash2, MapPin, Users, Briefcase, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-gray-500" />}
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
    </div>
  )
}

function AddForm({ fields, onSubmit, saving }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.name, f.default ?? ''])))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await onSubmit(values)
    if (ok) setValues(Object.fromEntries(fields.map(f => [f.name, f.default ?? ''])))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 mt-3">
      {fields.map(f => (
        <div key={f.name} className={f.width || 'flex-1 min-w-[140px]'}>
          {f.label && <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>}
          {f.type === 'checkbox' ? (
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
              <input
                type="checkbox"
                checked={!!values[f.name]}
                onChange={e => setValues(v => ({ ...v, [f.name]: e.target.checked }))}
                className="rounded"
              />
              {f.checkLabel || f.label}
            </label>
          ) : f.type === 'select' ? (
            <select
              value={values[f.name]}
              onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={f.required}
            >
              <option value="">— {f.label} —</option>
              {(f.options || []).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={f.type || 'text'}
              value={values[f.name]}
              onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
              placeholder={f.placeholder || f.label}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={f.required}
            />
          )}
        </div>
      ))}
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
      >
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </form>
  )
}

function DeleteBtn({ onDelete }) {
  return (
    <button
      onClick={onDelete}
      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

// People Section
function PeopleSection() {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: people = [] } = useQuery({
    queryKey: ['people-setup'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lu21_people')
        .select('*, lu22_department(name)')
        .order('last')
      return data || []
    },
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('lu22_department').select('*').order('name')
      return data || []
    },
  })

  async function handleAdd(values) {
    setSaving(true)
    try {
      const { error } = await supabase.from('lu21_people').insert({
        first: values.first,
        last: values.last,
        email: values.email,
        lu22_department_id: values.department || null,
        is_approver: !!values.is_approver,
      })
      if (error) throw error
      toast.success('Person added')
      qc.invalidateQueries({ queryKey: ['people-setup'] })
      qc.invalidateQueries({ queryKey: ['people'] })
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(person) {
    if (!confirm(`Delete ${person.first} ${person.last}?`)) return
    try {
      const { error } = await supabase.from('lu21_people').delete().eq('id', person.id)
      if (error) throw error
      toast.success('Person deleted')
      qc.invalidateQueries({ queryKey: ['people-setup'] })
      qc.invalidateQueries({ queryKey: ['people'] })
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs font-semibold text-gray-500 uppercase bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Department</th>
              <th className="px-3 py-2 text-center">Approver</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {people.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{p.first} {p.last}</td>
                <td className="px-3 py-2 text-gray-500">{p.email}</td>
                <td className="px-3 py-2 text-gray-500">{p.lu22_department?.name || '—'}</td>
                <td className="px-3 py-2 text-center">
                  {p.is_approver ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Yes</span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <DeleteBtn onDelete={() => handleDelete(p)} />
                </td>
              </tr>
            ))}
            {people.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400 text-xs">No people yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <AddForm
        saving={saving}
        onSubmit={handleAdd}
        fields={[
          { name: 'first', label: 'First Name', required: true },
          { name: 'last', label: 'Last Name', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          {
            name: 'department',
            label: 'Department',
            type: 'select',
            options: departments.map(d => ({ value: d.id, label: d.name })),
          },
          { name: 'is_approver', label: 'Approver', type: 'checkbox', checkLabel: 'Is Approver', default: false },
        ]}
      />
    </div>
  )
}

// Departments Section
function DepartmentsSection() {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('lu22_department').select('*').order('name')
      return data || []
    },
  })

  async function handleAdd(values) {
    setSaving(true)
    try {
      const { error } = await supabase.from('lu22_department').insert({ name: values.name })
      if (error) throw error
      toast.success('Department added')
      qc.invalidateQueries({ queryKey: ['departments'] })
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(dep) {
    if (!confirm(`Delete department "${dep.name}"?`)) return
    try {
      const { error } = await supabase.from('lu22_department').delete().eq('id', dep.id)
      if (error) throw error
      toast.success('Department deleted')
      qc.invalidateQueries({ queryKey: ['departments'] })
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="space-y-1">
        {departments.map(d => (
          <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-800">{d.name}</span>
            <DeleteBtn onDelete={() => handleDelete(d)} />
          </div>
        ))}
        {departments.length === 0 && <p className="text-sm text-gray-400 py-2">No departments yet</p>}
      </div>
      <AddForm
        saving={saving}
        onSubmit={handleAdd}
        fields={[{ name: 'name', label: 'Department Name', required: true }]}
      />
    </div>
  )
}

// Locations Section
function LocationsSection() {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [savingSub, setSavingSub] = useState(false)

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await supabase.from('lu30_location').select('*').order('loc_name')
      return data || []
    },
  })

  const { data: subLocations = [] } = useQuery({
    queryKey: ['sublocations', selectedLocation?.id],
    queryFn: async () => {
      if (!selectedLocation) return []
      const { data } = await supabase
        .from('lu31_sub_location')
        .select('*')
        .eq('lu30_location_id', selectedLocation.id)
        .order('subloc_name')
      return data || []
    },
    enabled: !!selectedLocation,
  })

  async function handleAddLocation(values) {
    setSaving(true)
    try {
      const { error } = await supabase.from('lu30_location').insert({ loc_name: values.loc_name })
      if (error) throw error
      toast.success('Location added')
      qc.invalidateQueries({ queryKey: ['locations'] })
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteLocation(loc) {
    if (!confirm(`Delete location "${loc.loc_name}"?`)) return
    try {
      const { error } = await supabase.from('lu30_location').delete().eq('id', loc.id)
      if (error) throw error
      toast.success('Location deleted')
      if (selectedLocation?.id === loc.id) setSelectedLocation(null)
      qc.invalidateQueries({ queryKey: ['locations'] })
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleAddSubLocation(values) {
    setSavingSub(true)
    try {
      const { error } = await supabase.from('lu31_sub_location').insert({
        lu30_location_id: selectedLocation.id,
        subloc_name: values.subloc_name,
      })
      if (error) throw error
      toast.success('Sub-location added')
      qc.invalidateQueries({ queryKey: ['sublocations', selectedLocation.id] })
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setSavingSub(false)
    }
  }

  async function handleDeleteSubLocation(sub) {
    if (!confirm(`Delete sub-location "${sub.subloc_name}"?`)) return
    try {
      const { error } = await supabase.from('lu31_sub_location').delete().eq('id', sub.id)
      if (error) throw error
      toast.success('Sub-location deleted')
      qc.invalidateQueries({ queryKey: ['sublocations', selectedLocation?.id] })
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-1">
        {locations.map(loc => (
          <div
            key={loc.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors
              ${selectedLocation?.id === loc.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
            onClick={() => setSelectedLocation(loc.id === selectedLocation?.id ? null : loc)}
          >
            <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {loc.loc_name}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Click to manage sub-locations</span>
              <DeleteBtn onDelete={(e) => { e?.stopPropagation?.(); handleDeleteLocation(loc) }} />
            </div>
          </div>
        ))}
        {locations.length === 0 && <p className="text-sm text-gray-400 py-2">No locations yet</p>}
      </div>
      <AddForm
        saving={saving}
        onSubmit={handleAddLocation}
        fields={[{ name: 'loc_name', label: 'Location Name', required: true }]}
      />

      {selectedLocation && (
        <div className="ml-4 border-l-2 border-blue-200 pl-4 space-y-3">
          <p className="text-sm font-semibold text-blue-700">
            Sub-locations for: {selectedLocation.loc_name}
          </p>
          <div className="space-y-1">
            {subLocations.map(sub => (
              <div key={sub.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-700">{sub.subloc_name}</span>
                <DeleteBtn onDelete={() => handleDeleteSubLocation(sub)} />
              </div>
            ))}
            {subLocations.length === 0 && <p className="text-xs text-gray-400 py-1">No sub-locations yet</p>}
          </div>
          <AddForm
            saving={savingSub}
            onSubmit={handleAddSubLocation}
            fields={[{ name: 'subloc_name', label: 'Sub-location Name', required: true }]}
          />
        </div>
      )}
    </div>
  )
}

// Equipment Section
function EquipmentSection() {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data } = await supabase.from('lu40_equipment').select('*').order('name')
      return data || []
    },
  })

  async function handleAdd(values) {
    setSaving(true)
    try {
      const { error } = await supabase.from('lu40_equipment').insert({ name: values.name })
      if (error) throw error
      toast.success('Equipment added')
      qc.invalidateQueries({ queryKey: ['equipment'] })
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(eq) {
    if (!confirm(`Delete equipment "${eq.name}"?`)) return
    try {
      const { error } = await supabase.from('lu40_equipment').delete().eq('id', eq.id)
      if (error) throw error
      toast.success('Equipment deleted')
      qc.invalidateQueries({ queryKey: ['equipment'] })
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="space-y-1">
        {equipment.map(eq => (
          <div key={eq.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-800">{eq.name}</span>
            <DeleteBtn onDelete={() => handleDelete(eq)} />
          </div>
        ))}
        {equipment.length === 0 && <p className="text-sm text-gray-400 py-2">No equipment yet</p>}
      </div>
      <AddForm
        saving={saving}
        onSubmit={handleAdd}
        fields={[{ name: 'name', label: 'Equipment Name', required: true }]}
      />
    </div>
  )
}

// Read-only table component
function ReadOnlyTable({ columns, rows, emptyMsg }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs font-semibold text-gray-500 uppercase bg-gray-50">
          <tr>
            {columns.map(col => (
              <th key={col} className="px-3 py-2 text-left">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-4 text-center text-gray-400 text-xs">
                {emptyMsg || 'No data'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function Setup() {
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await supabase.from('lu21_roles').select('*').order('id')
      return data || []
    },
  })

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

  const { data: problemPhases = [] } = useQuery({
    queryKey: ['problem-phases'],
    queryFn: async () => {
      const { data } = await supabase.from('lu11_problem_phase').select('*').order('sort_order')
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

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Setup</h2>
        <p className="text-sm text-gray-500 mt-1">Manage lookup tables and system configuration</p>
      </div>

      <Section title="People" icon={Users} defaultOpen>
        <PeopleSection />
      </Section>

      <Section title="Departments" icon={Briefcase}>
        <DepartmentsSection />
      </Section>

      <Section title="Locations & Sub-locations" icon={MapPin}>
        <LocationsSection />
      </Section>

      <Section title="Equipment" icon={Wrench}>
        <EquipmentSection />
      </Section>

      <Section title="Roles (pre-seeded, read-only)">
        <ReadOnlyTable
          columns={['Role', 'Description']}
          rows={roles.map(r => [r.role, r.role_desc])}
          emptyMsg="No roles seeded yet — run seed.sql"
        />
      </Section>

      <Section title="Cost / Effort / Reward Scales (pre-seeded)">
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Cost Scale</p>
            {costs.map(c => (
              <div key={c.id} className="text-xs text-gray-700 py-1 border-b border-gray-100 flex items-center gap-2">
                <span className="font-mono bg-gray-100 px-1 rounded">{c.cost_val}</span>
                {c.cost_name}
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Effort Scale</p>
            {efforts.map(e => (
              <div key={e.id} className="text-xs text-gray-700 py-1 border-b border-gray-100 flex items-center gap-2">
                <span className="font-mono bg-gray-100 px-1 rounded">{e.effort_val}</span>
                {e.effort_name}
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Reward Scale</p>
            {rewards.map(r => (
              <div key={r.id} className="text-xs text-gray-700 py-1 border-b border-gray-100 flex items-center gap-2">
                <span className="font-mono bg-gray-100 px-1 rounded">{r.reward_val}</span>
                {r.reward_name}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Problem Phases (pre-seeded)">
        <ReadOnlyTable
          columns={['Code', 'Name', 'Sort Order']}
          rows={problemPhases.map(p => [p.code, p.name, p.sort_order])}
          emptyMsg="No phases seeded yet — run seed.sql"
        />
      </Section>

      <Section title="Solution Phases (pre-seeded)">
        <ReadOnlyTable
          columns={['Code', 'Name', 'Sort Order']}
          rows={solutionPhases.map(p => [p.code, p.name, p.sort_order])}
          emptyMsg="No phases seeded yet — run seed.sql"
        />
      </Section>
    </div>
  )
}

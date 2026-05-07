import { useState, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { useAudit } from '../hooks/useAudit'
import toast from 'react-hot-toast'

const PROBLEM_FIELDS = [
  { value: '', label: '— Skip —' },
  { value: 'title', label: 'Title' },
  { value: 'prob_type', label: 'Problem Type' },
  { value: 'prob_statement', label: 'Problem Statement' },
  { value: 'location_name', label: 'Location Name' },
  { value: 'equipment_name', label: 'Equipment Name' },
  { value: 'one_drive_link', label: 'OneDrive Link' },
]

export default function Import() {
  const qc = useQueryClient()
  const { logChange } = useAudit()
  const fileInputRef = useRef(null)

  const [dragging, setDragging] = useState(false)
  const [parsedData, setParsedData] = useState(null)
  const [headers, setHeaders] = useState([])
  const [columnMap, setColumnMap] = useState({})
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [fileName, setFileName] = useState('')

  const { data: phases = [] } = useQuery({
    queryKey: ['problem-phases'],
    queryFn: async () => {
      const { data } = await supabase.from('lu11_problem_phase').select('*').order('sort_order')
      return data || []
    },
  })

  function parseFile(file) {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }
    setFileName(file.name)
    setResults(null)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length === 0) {
          toast.error('CSV file is empty')
          return
        }
        const hdrs = result.meta.fields || []
        setHeaders(hdrs)
        setParsedData(result.data)
        // Auto-map obvious headers
        const autoMap = {}
        hdrs.forEach(h => {
          const lh = h.toLowerCase().trim()
          if (lh.includes('title')) autoMap[h] = 'title'
          else if (lh.includes('type') || lh.includes('prob_type')) autoMap[h] = 'prob_type'
          else if (lh.includes('statement') || lh.includes('description')) autoMap[h] = 'prob_statement'
          else if (lh === 'location' || lh === 'loc_name' || lh === 'location_name') autoMap[h] = 'location_name'
          else if (lh.includes('equipment')) autoMap[h] = 'equipment_name'
          else if (lh.includes('onedrive') || lh.includes('one_drive')) autoMap[h] = 'one_drive_link'
        })
        setColumnMap(autoMap)
      },
      error: (err) => {
        toast.error(`Parse error: ${err.message}`)
      },
    })
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    parseFile(file)
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleFileChange = (e) => {
    parseFile(e.target.files[0])
  }

  function clearFile() {
    setParsedData(null)
    setHeaders([])
    setColumnMap({})
    setResults(null)
    setFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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

  async function upsertLocation(name) {
    if (!name) return null
    const trimmed = name.trim()
    const { data: existing } = await supabase
      .from('lu30_location')
      .select('id')
      .eq('loc_name', trimmed)
      .single()
    if (existing) return existing.id
    const { data: created, error } = await supabase
      .from('lu30_location')
      .insert({ loc_name: trimmed })
      .select('id')
      .single()
    if (error) throw error
    return created.id
  }

  async function upsertEquipment(name) {
    if (!name) return null
    const trimmed = name.trim()
    const { data: existing } = await supabase
      .from('lu40_equipment')
      .select('id')
      .eq('name', trimmed)
      .single()
    if (existing) return existing.id
    const { data: created, error } = await supabase
      .from('lu40_equipment')
      .insert({ name: trimmed })
      .select('id')
      .single()
    if (error) throw error
    return created.id
  }

  async function handleImport() {
    if (!parsedData || parsedData.length === 0) return

    const mappedFields = Object.values(columnMap).filter(Boolean)
    if (mappedFields.length === 0) {
      toast.error('Please map at least one column')
      return
    }

    setImporting(true)
    const p00 = phases.find(p => p.code === 'P00')
    let imported = 0
    let errors = []

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i]
      try {
        const rowData = {}
        headers.forEach(h => {
          const field = columnMap[h]
          if (field && row[h]) rowData[field] = row[h]
        })

        const probCode = await generateCode()

        // Upsert location if provided
        let locationId = null
        if (rowData.location_name) {
          locationId = await upsertLocation(rowData.location_name)
        }

        // Upsert equipment if provided
        let equipmentId = null
        if (rowData.equipment_name) {
          equipmentId = await upsertEquipment(rowData.equipment_name)
        }

        const probData = {
          prob_code: probCode,
          title: rowData.title || null,
          prob_type: rowData.prob_type || null,
          prob_statement: rowData.prob_statement || null,
          lu30_location_id: locationId,
          lu40_equipment_id: equipmentId,
          one_drive_link: rowData.one_drive_link || null,
        }

        const { data: newProb, error: probErr } = await supabase
          .from('t00_problems')
          .insert(probData)
          .select('id')
          .single()
        if (probErr) throw probErr

        // Create initial P00 status
        if (p00) {
          await supabase.from('lu10_problem_status').insert({
            t00_problems_id: newProb.id,
            lu11_problem_phase_id: p00.id,
            comm: 'Imported via CSV',
          })
        }

        await logChange({
          tableName: 't00_problems',
          recordId: newProb.id,
          actionDesc: `Problem ${probCode} imported from CSV (row ${i + 1})`,
        })

        imported++
      } catch (err) {
        errors.push({ row: i + 1, error: err.message || String(err) })
      }
    }

    setResults({ imported, errors, total: parsedData.length })
    setImporting(false)

    if (imported > 0) {
      toast.success(`Imported ${imported} problem(s)`)
      qc.invalidateQueries({ queryKey: ['problems-list'] })
      qc.invalidateQueries({ queryKey: ['dashboard-problems'] })
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['equipment'] })
    }
    if (errors.length > 0) {
      toast.error(`${errors.length} row(s) failed to import`)
    }
  }

  const preview = parsedData ? parsedData.slice(0, 5) : []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Import Problems</h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV file to bulk-import problems. Each row becomes a new problem at P00 status.
        </p>
      </div>

      {/* Drop zone */}
      {!parsedData && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
            ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'}`}
        >
          <Upload className={`h-10 w-10 mx-auto mb-3 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-gray-700 font-medium">Drop a CSV file here, or click to browse</p>
          <p className="text-sm text-gray-400 mt-1">Supports .csv files only</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* File loaded indicator */}
      {parsedData && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-800">{fileName}</p>
              <p className="text-xs text-blue-600">{parsedData.length} rows, {headers.length} columns</p>
            </div>
          </div>
          <button onClick={clearFile} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Column mapping */}
      {parsedData && headers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Map CSV Columns to Problem Fields</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {headers.map(h => (
              <div key={h} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-gray-500 truncate" title={h}>{h}</p>
                </div>
                <span className="text-gray-300">→</span>
                <select
                  value={columnMap[h] || ''}
                  onChange={e => setColumnMap(m => ({ ...m, [h]: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {PROBLEM_FIELDS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">
              Preview (first {preview.length} of {parsedData.length} rows)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  {headers.map(h => (
                    <th key={h} className="px-3 py-2 text-left">
                      <div>{h}</div>
                      {columnMap[h] && (
                        <div className="font-normal text-blue-500 normal-case">→ {columnMap[h]}</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    {headers.map(h => (
                      <td key={h} className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={row[h]}>
                        {row[h] || <span className="text-gray-300 italic">empty</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      {parsedData && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Ready to import <strong>{parsedData.length}</strong> rows as new problems
          </p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {importing ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Import {parsedData.length} Rows
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Import Results</h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{results.total}</p>
              <p className="text-xs text-blue-600 font-medium mt-1">Total Rows</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{results.imported}</p>
              <p className="text-xs text-green-600 font-medium mt-1">Imported</p>
            </div>
            <div className={`rounded-lg p-3 text-center border ${results.errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-2xl font-bold ${results.errors.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                {results.errors.length}
              </p>
              <p className={`text-xs font-medium mt-1 ${results.errors.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                Errors
              </p>
            </div>
          </div>

          {results.imported === results.total && results.errors.length === 0 && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm font-medium">All rows imported successfully!</p>
            </div>
          )}

          {results.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Failed rows:
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {results.errors.map(({ row, error }) => (
                  <div key={row} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span><strong>Row {row}:</strong> {error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">CSV Format Guide</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>Your CSV file should have a header row. Suggested column names (auto-mapped):</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {[
              'title', 'prob_type', 'prob_statement',
              'location', 'location_name', 'equipment',
              'equipment_name', 'one_drive_link',
            ].map(col => (
              <code key={col} className="bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700">
                {col}
              </code>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Valid Problem Types: Incident, Hazard, Risk, Delay, EWR, Idea
          </p>
          <p className="text-xs text-gray-500">
            Locations and Equipment that don't exist will be created automatically.
          </p>
        </div>
      </div>
    </div>
  )
}

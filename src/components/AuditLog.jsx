import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Clock } from 'lucide-react'

export default function AuditLog({ recordId, tableName }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit', tableName, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, lu21_people(first, last)')
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('changed_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
    enabled: !!recordId,
  })

  if (isLoading) return <p className="text-sm text-gray-400">Loading history...</p>
  if (logs.length === 0) return <p className="text-sm text-gray-400">No history yet.</p>

  return (
    <div className="space-y-2">
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-3 text-sm">
          <div className="mt-0.5 p-1.5 bg-gray-100 rounded-full text-gray-500 flex-shrink-0">
            <Clock className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800">{log.action_desc || `${log.field_changed} changed`}</p>
            {log.value_before !== null && log.value_after !== null && (
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="line-through mr-1">{log.value_before}</span>
                <span className="text-blue-600">{log.value_after}</span>
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
              <span>{new Date(log.changed_at).toLocaleString()}</span>
              {log.lu21_people && <span>by {log.lu21_people.first} {log.lu21_people.last}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

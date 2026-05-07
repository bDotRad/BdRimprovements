import { supabase } from '../lib/supabase'

export function useAudit() {
  async function logChange({ tableName, recordId, fieldChanged, valueBefore, valueAfter, actionDesc, changedBy }) {
    try {
      await supabase.from('audit_log').insert({
        table_name: tableName,
        record_id: recordId,
        field_changed: fieldChanged,
        value_before: valueBefore ? String(valueBefore) : null,
        value_after: valueAfter ? String(valueAfter) : null,
        action_desc: actionDesc,
        changed_by: changedBy || null,
      })
    } catch (err) {
      console.error('Audit log error:', err)
    }
  }

  return { logChange }
}

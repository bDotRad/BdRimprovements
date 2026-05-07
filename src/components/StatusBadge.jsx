import { PROBLEM_PHASES, SOLUTION_PHASES } from '../constants/workflow'

export default function StatusBadge({ code, className = '' }) {
  const info = PROBLEM_PHASES[code] || SOLUTION_PHASES[code]
  if (!info) return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${className}`}>
      {code || '—'}
    </span>
  )
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${info.bg} ${info.text} ${info.border} ${className}`}>
      <span className="font-mono mr-1">{code}</span>
      {info.name}
    </span>
  )
}

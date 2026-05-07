import { Check } from 'lucide-react'
import { PROBLEM_PHASES, SOLUTION_PHASES } from '../constants/workflow'

const PROBLEM_MAIN_FLOW = ['P00', 'P10', 'P20', 'P30', 'P40', 'P50']
const SOLUTION_MAIN_FLOW = ['S10', 'S20', 'S30', 'S40', 'S50', 'S60', 'S70']

export default function WorkflowStepper({ currentCode, type = 'problem' }) {
  const flow = type === 'problem' ? PROBLEM_MAIN_FLOW : SOLUTION_MAIN_FLOW
  const phases = type === 'problem' ? PROBLEM_PHASES : SOLUTION_PHASES
  const currentIdx = flow.indexOf(currentCode)
  const isOffFlow = currentIdx === -1

  return (
    <div className="overflow-x-auto">
      {isOffFlow && (
        <div className="mb-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-1.5">
          Current status: <strong>{phases[currentCode]?.name || currentCode}</strong> (off main flow)
        </div>
      )}
      <div className="flex items-center min-w-max">
        {flow.map((code, idx) => {
          const phase = phases[code]
          const isDone = currentIdx > idx
          const isCurrent = currentCode === code
          const isFuture = currentIdx !== -1 && currentIdx < idx

          return (
            <div key={code} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                  ${isDone
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                    ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-white border-gray-300 text-gray-400'}`}>
                  {isDone ? <Check className="h-4 w-4" /> : <span>{code.slice(1)}</span>}
                </div>
                <span className={`mt-1 text-xs text-center max-w-[60px] leading-tight
                  ${isDone ? 'text-green-600' : isCurrent ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
                  {phase?.name || code}
                </span>
              </div>
              {idx < flow.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

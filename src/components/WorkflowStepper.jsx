import { useState } from 'react'
import { Check, Pause, X, GitBranch } from 'lucide-react'
import { PROBLEM_PHASES, SOLUTION_PHASES } from '../constants/workflow'
import WorkflowDiagramModal from './WorkflowDiagramModal'

const PROBLEM_MAIN_FLOW = ['P00', 'P10', 'P15', 'P20', 'P30', 'P40', 'P50']
const SOLUTION_MAIN_FLOW = ['S10', 'S20', 'S30', 'S40', 'S50', 'S60', 'S70']

// Off-flow branch phases shown as status pills rather than stepper nodes
const PROBLEM_BRANCH = {
  P25: { label: 'Solution Dev On Hold', color: 'yellow' },
  P29: { label: 'Problem Cancelled',    color: 'red'    },
}
const SOLUTION_BRANCH = {
  S25: { label: 'On Hold',   color: 'yellow' },
  S59: { label: 'Cancelled', color: 'red'    },
}

export default function WorkflowStepper({ currentCode, type = 'problem' }) {
  const [showMap, setShowMap] = useState(false)

  const flow   = type === 'problem' ? PROBLEM_MAIN_FLOW : SOLUTION_MAIN_FLOW
  const phases = type === 'problem' ? PROBLEM_PHASES    : SOLUTION_PHASES
  const branch = type === 'problem' ? PROBLEM_BRANCH    : SOLUTION_BRANCH

  const currentIdx = flow.indexOf(currentCode)
  const isOnFlow   = currentIdx !== -1
  const isBranch   = currentCode in branch

  const branchColors = {
    yellow: 'bg-yellow-50 border-yellow-300 text-yellow-700',
    red:    'bg-red-50 border-red-300 text-red-700',
  }

  return (
    <div className="space-y-3">
      {/* Top row: branch pill + map button */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {isBranch && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${branchColors[branch[currentCode].color]}`}>
              {branch[currentCode].color === 'yellow'
                ? <Pause className="h-4 w-4" />
                : <X className="h-4 w-4" />
              }
              <span className="font-mono text-xs mr-1">{currentCode}</span>
              {branch[currentCode].label}
            </div>
          )}
        </div>
        {type === 'problem' && (
          <button
            onClick={() => setShowMap(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors whitespace-nowrap"
          >
            <GitBranch className="h-3.5 w-3.5" />
            View Process Map
          </button>
        )}
      </div>

      {/* Main stepper */}
      <div className="overflow-x-auto">
        <div className="flex items-center min-w-max">
          {flow.map((code, idx) => {
            const phase     = phases[code]
            const isDone    = isOnFlow && currentIdx > idx
            const isCurrent = currentCode === code

            return (
              <div key={code} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                    ${isDone
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100'
                      : isBranch && idx <= (flow.indexOf('P10') ?? flow.indexOf('S10'))
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                    {(isDone || (isBranch && idx < flow.length - 1 && idx <= 1))
                      ? <Check className="h-4 w-4" />
                      : <span>{code.slice(1)}</span>
                    }
                  </div>
                  <span className={`mt-1 text-xs text-center max-w-[60px] leading-tight
                    ${isDone ? 'text-green-600'
                      : isCurrent ? 'text-blue-700 font-semibold'
                      : 'text-gray-400'}`}>
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

      {showMap && (
        <WorkflowDiagramModal currentCode={currentCode} onClose={() => setShowMap(false)} />
      )}
    </div>
  )
}

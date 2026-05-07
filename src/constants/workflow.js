export const PROBLEM_PHASES = {
  P00: { code: 'P00', name: 'Data Entry', color: 'gray', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  P10: { code: 'P10', name: 'Problem Assessed', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  P15: { code: 'P15', name: 'On Hold', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  P19: { code: 'P19', name: 'Cancelled', color: 'red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  P20: { code: 'P20', name: 'Confirmed', color: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  P30: { code: 'P30', name: 'In Development', color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  P40: { code: 'P40', name: 'Final Review', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  P50: { code: 'P50', name: 'Closed', color: 'green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
}

export const SOLUTION_PHASES = {
  S10: { code: 'S10', name: 'Concept', color: 'gray', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  S20: { code: 'S20', name: 'Review', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', requiresApprover: true },
  S25: { code: 'S25', name: 'On Hold', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  S30: { code: 'S30', name: 'Design', color: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  S40: { code: 'S40', name: 'Scope/Est', color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  S50: { code: 'S50', name: 'Approve', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', requiresApprover: true },
  S59: { code: 'S59', name: 'Cancelled', color: 'red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  S60: { code: 'S60', name: 'Execute', color: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
  S70: { code: 'S70', name: 'Complete', color: 'green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
}

export const PROBLEM_TRANSITIONS = {
  P00: [{ to: 'P10', label: 'Assess Problem' }],
  P10: [
    { to: 'P20', label: 'Confirm Problem' },
    { to: 'P15', label: 'Put on Hold' },
    { to: 'P19', label: 'Cancel' },
  ],
  P15: [
    { to: 'P10', label: 'Re-assess' },
    { to: 'P19', label: 'Cancel' },
  ],
  P20: [
    { to: 'P30', label: 'Develop Solutions' },
    { to: 'P19', label: 'Cancel' },
  ],
  P30: [],
  P40: [
    { to: 'P50', label: 'Close Problem' },
    { to: 'P10', label: 'Re-assess (Unresolved)' },
  ],
  P50: [],
  P19: [],
}

export const SOLUTION_TRANSITIONS = {
  S10: [{ to: 'S20', label: 'Submit for Review' }],
  S20: [
    { to: 'S30', label: 'Approve — Begin Design', requiresApprover: true },
    { to: 'S25', label: 'Put on Hold' },
    { to: 'S59', label: 'Cancel Solution' },
  ],
  S25: [
    { to: 'S20', label: 'Resume Review' },
    { to: 'S59', label: 'Cancel Solution' },
  ],
  S30: [{ to: 'S40', label: 'Complete Design' }],
  S40: [{ to: 'S50', label: 'Submit for Approval' }],
  S50: [
    { to: 'S60', label: 'Approve Execution', requiresApprover: true },
    { to: 'S59', label: 'Cancel Solution' },
  ],
  S60: [{ to: 'S70', label: 'Mark Complete' }],
  S70: [],
  S59: [],
}

export const TERMINAL_PHASES = ['P19', 'P50', 'S59', 'S70']
export const INACTIVE_SOLUTION_PHASES = ['S70', 'S59', 'S25']
export const PROB_TYPES = ['Incident', 'Hazard', 'Risk', 'Delay', 'EWR', 'Idea']

export const REVIEW_MILESTONES = {
  P10: { weeks: 1, label: '1 Week' },
  P15: { weeks: 12, label: '12 Weeks' },
  S20: { weeks: 1, label: '1 Week' },
  S40: { weeks: 4, label: '1 Month' },
  S50: { weeks: 1, label: '1 Week' },
}

export function getPhaseInfo(code) {
  return PROBLEM_PHASES[code] || SOLUTION_PHASES[code] || null
}

export function isProblemPhase(code) {
  return code in PROBLEM_PHASES
}

export function isSolutionPhase(code) {
  return code in SOLUTION_PHASES
}

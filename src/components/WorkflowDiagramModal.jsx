import { X } from 'lucide-react'
import { PROBLEM_PHASES } from '../constants/workflow'

const NW = 86, NH = 38, HW = 43, HH = 19

// Center (x, y) for each phase node
const POS = {
  P00: { x: 55,  y: 74 },
  P10: { x: 188, y: 74 },
  P20: { x: 330, y: 74 },
  P30: { x: 468, y: 74 },
  P40: { x: 588, y: 74 },
  P50: { x: 708, y: 74 },
  P15: { x: 188, y: 188 },
  P25: { x: 330, y: 188 },
  P29: { x: 468, y: 188 },
}

const SHORT = {
  P00: 'Data Entry',
  P10: 'Assess',
  P15: 'Confirm (trial)',
  P20: 'Assessed',
  P25: 'Dev On Hold',
  P29: 'Cancelled',
  P30: 'Dev & Execute',
  P40: 'Review',
  P50: 'Closed',
}

const CFILL   = { gray:'#f3f4f6', blue:'#dbeafe', cyan:'#cffafe', indigo:'#e0e7ff', yellow:'#fef9c3', red:'#fee2e2', purple:'#f3e8ff', orange:'#ffedd5', green:'#dcfce7' }
const CSTROKE = { gray:'#9ca3af', blue:'#3b82f6', cyan:'#06b6d4', indigo:'#6366f1', yellow:'#ca8a04', red:'#ef4444', purple:'#a855f7', orange:'#f97316', green:'#22c55e' }
const CTEXT   = { gray:'#374151', blue:'#1d4ed8', cyan:'#0e7490', indigo:'#4338ca', yellow:'#854d0e', red:'#b91c1c', purple:'#7e22ce', orange:'#c2410c', green:'#15803d' }

const MARKER_DEFS = [
  { id: 'arr-blue',   fill: '#3b82f6' },
  { id: 'arr-gray',   fill: '#9ca3af' },
  { id: 'arr-amber',  fill: '#d97706' },
  { id: 'arr-red',    fill: '#ef4444' },
  { id: 'arr-purple', fill: '#7c3aed' },
]

export default function WorkflowDiagramModal({ currentCode, onClose }) {
  const SVG_W = 760
  const SVG_H = 225

  // Derived edges for main flow (from right/bottom of source to left/top of target)
  const mainArrows = [
    [POS.P00.x + HW, POS.P00.y,  POS.P10.x - HW, POS.P10.y],  // P00→P10
    [POS.P10.x + HW, POS.P10.y,  POS.P20.x - HW, POS.P20.y],  // P10→P20
    [POS.P20.x + HW, POS.P20.y,  POS.P30.x - HW, POS.P30.y],  // P20→P30
    [POS.P30.x + HW, POS.P30.y,  POS.P40.x - HW, POS.P40.y],  // P30→P40
    [POS.P40.x + HW, POS.P40.y,  POS.P50.x - HW, POS.P50.y],  // P40→P50
  ]

  const branchDownArrows = [
    [POS.P10.x, POS.P10.y + HH, POS.P15.x, POS.P15.y - HH],  // P10→P15
    [POS.P20.x, POS.P20.y + HH, POS.P25.x, POS.P25.y - HH],  // P20→P25
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Problem Workflow Map</h2>
            {currentCode && PROBLEM_PHASES[currentCode] && (
              <p className="text-sm text-gray-500 mt-0.5">
                Current phase:&nbsp;
                <span className="font-mono font-semibold text-blue-700">{currentCode}</span>
                &nbsp;—&nbsp;{PROBLEM_PHASES[currentCode].name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Diagram */}
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width={SVG_W}
            height={SVG_H}
            style={{ minWidth: SVG_W }}
            className="block"
          >
            <defs>
              {MARKER_DEFS.map(({ id, fill }) => (
                <marker
                  key={id} id={id}
                  markerWidth="8" markerHeight="6"
                  refX="8" refY="3"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <polygon points="0 0, 8 3, 0 6" fill={fill} />
                </marker>
              ))}
            </defs>

            {/* ── ARROWS (behind nodes) ─────────────────────────── */}

            {/* Main flow: solid blue */}
            {mainArrows.map(([x1, y1, x2, y2], i) => (
              <line
                key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#3b82f6" strokeWidth={1.5}
                markerEnd="url(#arr-blue)"
              />
            ))}

            {/* Down to branch: gray */}
            {branchDownArrows.map(([x1, y1, x2, y2], i) => (
              <line
                key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#9ca3af" strokeWidth={1.5}
                markerEnd="url(#arr-gray)"
              />
            ))}

            {/* P25 → P29 cancel (red) */}
            <line
              x1={POS.P25.x + HW} y1={POS.P25.y}
              x2={POS.P29.x - HW} y2={POS.P29.y}
              stroke="#ef4444" strokeWidth={1.5}
              markerEnd="url(#arr-red)"
            />

            {/* P15 → P10 back (amber, U-turn left) */}
            <path
              d={`M ${POS.P15.x - HW},${POS.P15.y} L 104,${POS.P15.y} L 104,${POS.P10.y} L ${POS.P10.x - HW},${POS.P10.y}`}
              fill="none" stroke="#d97706" strokeWidth={1.5}
              markerEnd="url(#arr-amber)"
            />

            {/* P25 → P20 resume (amber, U-turn left) */}
            <path
              d={`M ${POS.P25.x - HW},${POS.P25.y} L 247,${POS.P25.y} L 247,${POS.P20.y} L ${POS.P20.x - HW},${POS.P20.y}`}
              fill="none" stroke="#d97706" strokeWidth={1.5}
              markerEnd="url(#arr-amber)"
            />

            {/* P20 → P29 direct cancel (red, dashed curve) */}
            <path
              d={`M ${POS.P20.x},${POS.P20.y + HH} C ${POS.P20.x},138 ${POS.P29.x - HW},138 ${POS.P29.x - HW},${POS.P29.y - HH}`}
              fill="none" stroke="#ef4444" strokeWidth={1.5}
              strokeDasharray="5,3"
              markerEnd="url(#arr-red)"
            />

            {/* P40 → P10 re-assess (purple, dashed arc over top) */}
            <path
              d={`M ${POS.P40.x},${POS.P40.y - HH} L ${POS.P40.x},20 L ${POS.P10.x},20 L ${POS.P10.x},${POS.P10.y - HH}`}
              fill="none" stroke="#7c3aed" strokeWidth={1.5}
              strokeDasharray="5,3"
              markerEnd="url(#arr-purple)"
            />
            <text x={(POS.P40.x + POS.P10.x) / 2} y={16}
              textAnchor="middle" fontSize={8} fill="#7c3aed" fontStyle="italic">
              Re-assess (Unresolved)
            </text>

            {/* ── NODES (on top of arrows) ──────────────────────── */}
            {Object.entries(POS).map(([code, { x, y }]) => {
              const phase = PROBLEM_PHASES[code]
              const color = phase?.color || 'gray'
              const isCurrent = currentCode === code

              return (
                <g key={code}>
                  {isCurrent && (
                    <>
                      {/* Outer glow ring */}
                      <rect
                        x={x - HW - 5} y={y - HH - 5}
                        width={NW + 10} height={NH + 10}
                        rx={9} fill="none"
                        stroke="#2563eb" strokeWidth={2.5}
                        opacity={0.6}
                      />
                      {/* Pulse ring (lighter) */}
                      <rect
                        x={x - HW - 9} y={y - HH - 9}
                        width={NW + 18} height={NH + 18}
                        rx={12} fill="none"
                        stroke="#93c5fd" strokeWidth={1.5}
                        opacity={0.4}
                      />
                    </>
                  )}
                  <rect
                    x={x - HW} y={y - HH}
                    width={NW} height={NH}
                    rx={5}
                    fill={CFILL[color]}
                    stroke={isCurrent ? '#2563eb' : CSTROKE[color]}
                    strokeWidth={isCurrent ? 2 : 1.5}
                  />
                  <text
                    x={x} y={y - 5}
                    textAnchor="middle"
                    fontSize={9} fontWeight="700"
                    fill={CTEXT[color]}
                    fontFamily="monospace"
                  >{code}</text>
                  <text
                    x={x} y={y + 9}
                    textAnchor="middle"
                    fontSize={7.5}
                    fill={CTEXT[color]}
                  >{SHORT[code]}</text>
                </g>
              )
            })}

            {/* Small inline labels on non-obvious arrows */}
            <text x={126} y={133} fontSize={7} fill="#d97706" fontStyle="italic" textAnchor="middle"
              transform={`rotate(-90, 126, 133)`}>Back</text>
            <text x={269} y={133} fontSize={7} fill="#d97706" fontStyle="italic" textAnchor="middle"
              transform={`rotate(-90, 269, 133)`}>Resume</text>
            <text x={400} y={178} fontSize={7} fill="#ef4444" fontStyle="italic" textAnchor="middle">Cancel</text>
            <text x={345} y={125} fontSize={7} fill="#ef4444" fontStyle="italic" textAnchor="start">Cancel</text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-5 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
          {[
            { stroke: '#3b82f6', dashed: false, label: 'Main progression' },
            { stroke: '#9ca3af', dashed: false, label: 'Branch state' },
            { stroke: '#d97706', dashed: false, label: 'Return / Resume' },
            { stroke: '#ef4444', dashed: false, label: 'Cancel' },
            { stroke: '#ef4444', dashed: true,  label: 'Direct cancel' },
            { stroke: '#7c3aed', dashed: true,  label: 'Re-assess' },
          ].map(({ stroke, dashed, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <svg width={22} height={8}>
                <line
                  x1={0} y1={4} x2={22} y2={4}
                  stroke={stroke} strokeWidth={1.5}
                  strokeDasharray={dashed ? '4,2' : undefined}
                />
              </svg>
              {label}
            </span>
          ))}
          {currentCode && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 rounded border-2 border-blue-600 bg-blue-50" />
              Current phase
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import type { Risk } from '@/types/risk'

interface RiskMatrixProps {
  risks: Risk[]
  onRiskClick?: (risk: Risk) => void
}

// Farben für Risk-Score (5x5 Matrix)
const getCellColor = (probability: number, impact: number): string => {
  const score = probability * impact
  if (score >= 15) return '#ef4444' // Rot - Kritisch
  if (score >= 10) return '#f97316' // Orange - Hoch
  if (score >= 6) return '#eab308'  // Gelb - Mittel
  if (score >= 3) return '#84cc16'  // Hellgrün - Niedrig
  return '#22c55e'                   // Grün - Minimal
}

const getCellTextColor = (probability: number, impact: number): string => {
  const score = probability * impact
  if (score >= 10) return '#ffffff'
  return '#1f2937'
}

export default function RiskMatrix({ risks, onRiskClick }: RiskMatrixProps) {
  // Gruppiere Risiken nach Position in der Matrix
  const risksByPosition = useMemo(() => {
    const map: Record<string, Risk[]> = {}
    risks.forEach(risk => {
      if (risk.status === 'closed') return // Geschlossene Risiken nicht anzeigen
      const key = `${risk.probability}-${risk.impact}`
      if (!map[key]) map[key] = []
      map[key].push(risk)
    })
    return map
  }, [risks])

  const cellSize = 80
  const padding = 40
  const labelSize = 30

  return (
    <div className="bg-[#1a2e1a] rounded-lg p-6 border border-[#2d4a2d]">
      <h3 className="text-lg font-semibold text-[#d4a574] mb-4">Risk-Matrix</h3>
      
      <svg 
        viewBox={`0 0 ${cellSize * 5 + padding + labelSize} ${cellSize * 5 + padding + labelSize}`}
        className="w-full max-w-[500px] mx-auto"
      >
        {/* Y-Axis Label */}
        <text 
          x={15} 
          y={(cellSize * 5 + padding) / 2 + labelSize}
          transform={`rotate(-90, 15, ${(cellSize * 5 + padding) / 2 + labelSize})`}
          className="fill-[#a3b18a] text-xs font-medium"
          textAnchor="middle"
        >
          Wahrscheinlichkeit →
        </text>

        {/* X-Axis Label */}
        <text 
          x={(cellSize * 5 + padding) / 2 + labelSize} 
          y={cellSize * 5 + padding + labelSize - 5}
          className="fill-[#a3b18a] text-xs font-medium"
          textAnchor="middle"
        >
          Auswirkung →
        </text>

        {/* Y-Axis Numbers */}
        {[5, 4, 3, 2, 1].map((prob, i) => (
          <text
            key={`y-${prob}`}
            x={padding - 8}
            y={i * cellSize + cellSize / 2 + 5}
            className="fill-[#a3b18a] text-sm"
            textAnchor="middle"
          >
            {prob}
          </text>
        ))}

        {/* X-Axis Numbers */}
        {[1, 2, 3, 4, 5].map((imp, i) => (
          <text
            key={`x-${imp}`}
            x={padding + i * cellSize + cellSize / 2}
            y={cellSize * 5 + 20}
            className="fill-[#a3b18a] text-sm"
            textAnchor="middle"
          >
            {imp}
          </text>
        ))}

        {/* Matrix Cells */}
        {[5, 4, 3, 2, 1].map((prob, yi) => (
          [1, 2, 3, 4, 5].map((imp, xi) => {
            const key = `${prob}-${imp}`
            const cellRisks = risksByPosition[key] || []
            const bgColor = getCellColor(prob, imp)
            const textColor = getCellTextColor(prob, imp)
            
            return (
              <g key={key}>
                {/* Cell Background */}
                <rect
                  x={padding + xi * cellSize}
                  y={yi * cellSize}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  fill={bgColor}
                  rx={4}
                  className="opacity-80 hover:opacity-100 transition-opacity"
                />
                
                {/* Risk Count or Dots */}
                {cellRisks.length > 0 && (
                  cellRisks.length <= 3 ? (
                    // Show dots for 1-3 risks
                    cellRisks.map((risk, idx) => (
                      <circle
                        key={risk.id}
                        cx={padding + xi * cellSize + cellSize / 2 + (idx - 1) * 15}
                        cy={yi * cellSize + cellSize / 2}
                        r={8}
                        fill={textColor}
                        className="cursor-pointer hover:scale-125 transition-transform origin-center"
                        onClick={() => onRiskClick?.(risk)}
                      >
                        <title>{risk.title}</title>
                      </circle>
                    ))
                  ) : (
                    // Show count for 4+ risks
                    <text
                      x={padding + xi * cellSize + cellSize / 2}
                      y={yi * cellSize + cellSize / 2 + 6}
                      fill={textColor}
                      className="text-lg font-bold cursor-pointer"
                      textAnchor="middle"
                      onClick={() => cellRisks[0] && onRiskClick?.(cellRisks[0])}
                    >
                      {cellRisks.length}
                    </text>
                  )
                )}
              </g>
            )
          })
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#22c55e]" />
          <span className="text-[#a3b18a]">Minimal (1-2)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#84cc16]" />
          <span className="text-[#a3b18a]">Niedrig (3-5)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#eab308]" />
          <span className="text-[#a3b18a]">Mittel (6-9)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#f97316]" />
          <span className="text-[#a3b18a]">Hoch (10-14)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#ef4444]" />
          <span className="text-[#a3b18a]">Kritisch (15-25)</span>
        </div>
      </div>
    </div>
  )
}

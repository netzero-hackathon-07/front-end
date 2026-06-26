import { Handle, Position } from '@xyflow/react'

const ROLE_COLORS = {
  orchestrator: '#7c3aed',
  planner:      '#0891b2',
  executor:     '#0a7a4a',
  reviewer:     '#b45309',
  summarizer:   '#be185d',
  critic:       '#dc2626',
  custom:       '#4b5563',
}

const ROLE_LABELS = {
  orchestrator: '오케스트레이터',
  planner:      '플래너',
  executor:     '익스큐터',
  reviewer:     '리뷰어',
  summarizer:   '서머라이저',
  critic:       '크리틱',
  custom:       '커스텀',
}

const MODEL_PRICES = {
  'claude-opus-4':    { input: 15.0,  output: 75.0  },
  'claude-sonnet-4':  { input: 3.0,   output: 15.0  },
  'claude-haiku-3-5': { input: 0.8,   output: 4.0   },
  'gpt-4o':           { input: 2.5,   output: 10.0  },
  'gpt-4o-mini':      { input: 0.15,  output: 0.6   },
  'o3-mini':          { input: 1.1,   output: 4.4   },
  'gemini-2.0-flash': { input: 0.1,   output: 0.4   },
}

function calcCost(model, inputTokens, outputTokens, callCount = 1) {
  const p = MODEL_PRICES[model]
  if (!p) return 0
  return ((inputTokens / 1_000_000 * p.input) + (outputTokens / 1_000_000 * p.output)) * callCount
}

export default function AgentNode({ data, selected }) {
  const color     = ROLE_COLORS[data.role] || '#4b5563'
  const callCount = data.callCount || 1
  const cost      = calcCost(data.model, data.inputTokens, data.outputTokens, callCount)
  const isChanged = data.changed

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: `2px solid ${isChanged ? '#b45309' : selected ? 'var(--teal)' : 'var(--teal-dim)'}`,
      borderTop: `3px solid ${isChanged ? '#b45309' : color}`,
      borderRadius: 8,
      padding: '14px 18px',
      minWidth: 180,
      boxShadow: selected
        ? '0 2px 12px var(--teal-dim)'
        : '0 1px 4px var(--teal-dim)',
      transition: 'all .2s',
      position: 'relative',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--teal)', border: 'none', width: 10, height: 10 }} />

      {/* 변경 배지 */}
      {isChanged && (
        <div style={{
          position: 'absolute', top: -10, right: 10,
          background: '#b45309', borderRadius: 10,
          padding: '2px 8px', fontSize: 10, color: '#fff', fontWeight: 700,
        }}>
          변경됨
        </div>
      )}

      {/* 반복 횟수 배지 */}
      {callCount > 1 && (
        <div style={{
          position: 'absolute', top: -10, left: 10,
          background: 'var(--teal)', borderRadius: 10,
          padding: '2px 8px', fontSize: 10, color: '#fff', fontWeight: 700,
        }}>
          ×{callCount}
        </div>
      )}

      {/* 역할 배지 */}
      <div style={{
        display: 'inline-block',
        background: color + '18',
        border: `1px solid ${color}`,
        borderRadius: 20,
        padding: '2px 10px',
        fontSize: 10, color, letterSpacing: 1,
        marginBottom: 8, fontWeight: 600,
      }}>
        {ROLE_LABELS[data.role] || data.role}
      </div>

      {/* 노드 이름 */}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
        {data.label}
      </div>

      {/* 이전 모델 */}
      {isChanged && data.originalModel && (
        <div style={{ fontSize: 10, color: 'var(--teal-mid)', textDecoration: 'line-through', marginBottom: 2 }}>
          {data.originalModel}
        </div>
      )}

      {/* 모델명 */}
      <div style={{ fontSize: 11, color: isChanged ? '#b45309' : 'var(--teal-mid)', marginBottom: 8 }}>
        {data.model}
      </div>

      {/* 비용 */}
      <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>
        ${cost.toFixed(4)}
        {callCount > 1 && (
          <span style={{ fontSize: 10, color: 'var(--teal-mid)', marginLeft: 6 }}>
            (×{callCount} 호출)
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--teal)', border: 'none', width: 10, height: 10 }} />
    </div>
  )
}
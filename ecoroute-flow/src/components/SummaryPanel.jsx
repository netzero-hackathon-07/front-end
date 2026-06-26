const ROLE_LABELS = {
  orchestrator: '오케스트레이터', planner: '플래너', executor: '익스큐터',
  reviewer: '리뷰어', summarizer: '서머라이저', critic: '크리틱', custom: '커스텀',
}

export default function SummaryPanel({ nodes, totalCost, co2, trees, calcCost }) {
  const sorted = [...nodes].sort((a, b) =>
    calcCost(b.data.model, b.data.inputTokens, b.data.outputTokens, b.data.callCount || 1) -
    calcCost(a.data.model, a.data.inputTokens, a.data.outputTokens, a.data.callCount || 1)
  )
  const bottleneck = sorted[0]
  const totalTokens   = nodes.reduce((sum, n) => sum + (n.data.inputTokens + n.data.outputTokens) * (n.data.callCount || 1), 0)
  const totalCalls    = nodes.reduce((sum, n) => sum + (n.data.callCount || 1), 0)
  const avgNodeCost   = nodes.length > 0 ? totalCost / nodes.length : 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-panel)',
      borderRight: '2px solid var(--teal)',
      flexShrink: 0, width: 160, overflowY: 'auto',
    }}>
      <Cell label="총 파이프라인 비용" value={`$${totalCost.toFixed(5)}`} color="var(--green)" />
      <Divider />
      <Cell label="CO₂ 추정" value={`${(co2 * 1000).toFixed(4)}g`} color="var(--teal-lite)" />
      <Divider />
      <Cell label="나무 환산" value={`🌳 ×${trees.toFixed(6)}`} color="var(--teal-lite)" />
      <Divider />
      <Cell label="총 토큰 수" value={totalTokens.toLocaleString()} color="var(--teal-mid)" />
      <Divider />
      <Cell label="총 호출 수" value={`${totalCalls}회`} color="var(--teal-mid)" />
      <Divider />
      <Cell label="평균 노드 비용" value={`$${avgNodeCost.toFixed(6)}`} color="var(--teal-mid)" />
      <Divider />
      <Cell label="노드 수" value={`${nodes.length}개`} color="var(--teal-mid)" />
      <Divider />
      <Cell
        label="최고 비용 노드"
        value={bottleneck ? `${ROLE_LABELS[bottleneck.data.role]}` : '—'}
        color="var(--teal)"
        sub={bottleneck ? `${bottleneck.data.model}\n$${calcCost(bottleneck.data.model, bottleneck.data.inputTokens, bottleneck.data.outputTokens, bottleneck.data.callCount || 1).toFixed(6)}` : ''}
      />
    </div>
  )
}

function Cell({ label, value, color, sub }) {
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 9, color: 'var(--teal-mid)', letterSpacing: 2, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, color, fontWeight: 700 }}>{value}</div>
      {sub && sub.split('\n').map((line, i) => (
        <div key={i} style={{ fontSize: 10, color: 'var(--teal-mid)', marginTop: 3 }}>{line}</div>
      ))}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--teal-dim2)', margin: '0 16px' }} />
}
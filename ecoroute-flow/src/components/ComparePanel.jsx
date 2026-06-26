const ROLE_LABELS = {
  orchestrator: '오케스트레이터', planner: '플래너', executor: '익스큐터',
  reviewer: '리뷰어', summarizer: '서머라이저', critic: '크리틱', custom: '커스텀',
}

export default function ComparePanel({ currentNodes, optimalNodes, calcCost, onApply, onClose, improvementMetrics }) {
  const currentTotal = currentNodes.reduce((sum, n) => sum + calcCost(n.data.model, n.data.inputTokens, n.data.outputTokens, n.data.callCount || 1), 0)
  const optimalTotal = optimalNodes.reduce((sum, n) => sum + calcCost(n.data.model, n.data.inputTokens, n.data.outputTokens, n.data.callCount || 1), 0)

  // 백엔드 metrics가 있으면 사용, 없으면 클라이언트 계산
  const savedCost = improvementMetrics?.cost_savings_usd ?? (currentTotal - optimalTotal)
  const savedPct  = improvementMetrics?.cost_savings_percent ?? (currentTotal > 0 ? (savedCost / currentTotal * 100) : 0)

  const currentTokens = currentNodes.reduce((sum, n) => sum + (n.data.inputTokens + n.data.outputTokens) * (n.data.callCount || 1), 0)
  const optimalTokens = optimalNodes.reduce((sum, n) => sum + (n.data.inputTokens + n.data.outputTokens) * (n.data.callCount || 1), 0)
  const currentCo2 = (currentTokens / 1_000_000) * 0.3 * 0.4
  const optimalCo2 = (optimalTokens / 1_000_000) * 0.3 * 0.4
  const savedCo2   = improvementMetrics?.carbon_savings_kg ?? (currentCo2 - optimalCo2)

  const changedNodes = optimalNodes.filter(n => n.data.changed)

  return (
    <div style={{
      width: 360,
      background: 'var(--bg-panel)',
      borderLeft: '2px solid var(--teal)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', flexShrink: 0,
      animation: 'slideIn .25s ease',
    }}>

      {/* 헤더 */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--teal-dim)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 12, color: 'var(--teal)', letterSpacing: 2 }}>⚡ 최적화 분석</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--teal-mid)', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      {/* 절감 요약 */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--teal-dim)' }}>
        <div style={{ fontSize: 10, color: 'var(--teal-mid)', letterSpacing: 2, marginBottom: 12 }}>절감 효과 요약</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <SummaryCard label="비용 절감" value={`$${savedCost.toFixed(5)}`} sub={`${savedPct.toFixed(1)}% 절약`} color="var(--green)" />
          <SummaryCard label="CO₂ 절감" value={`${(savedCo2 * 1000).toFixed(4)}g`} sub="탄소 감축" color="var(--teal-lite)" />
        </div>

        {/* 비용 비교 바 */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--teal-mid)', marginBottom: 6 }}>
            <span>현재 ${currentTotal.toFixed(5)}</span>
            <span>최적 ${optimalTotal.toFixed(5)}</span>
          </div>
          <div style={{ height: 6, background: 'var(--teal-dim2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, var(--green-mid), var(--teal-lite))',
              width: `${Math.max(10, 100 - savedPct)}%`,
              transition: 'width .6s ease',
            }} />
          </div>
        </div>
      </div>

      {/* 노드별 비교 */}
      <div style={{ padding: '16px 20px', flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--teal-mid)', letterSpacing: 2, marginBottom: 12 }}>노드별 분석</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {optimalNodes.map((optNode, i) => {
            const curNode = currentNodes[i]
            if (!curNode) return null
            const curCost = calcCost(curNode.data.model, curNode.data.inputTokens, curNode.data.outputTokens, curNode.data.callCount || 1)
            const optCost = calcCost(optNode.data.model, optNode.data.inputTokens, optNode.data.outputTokens, optNode.data.callCount || 1)
            const diff    = curCost - optCost

            return (
              <div key={optNode.id} style={{
                background: 'var(--teal-dim2)',
                border: `1px solid ${optNode.data.changed ? 'var(--teal)' : 'var(--teal-dim)'}`,
                borderLeft: `3px solid ${optNode.data.changed ? 'var(--teal)' : 'var(--teal-dim)'}`,
                borderRadius: 8, padding: '12px 14px',
              }}>
                {/* 역할 */}
                <div style={{ fontSize: 11, color: 'var(--teal-mid)', marginBottom: 8 }}>
                  {ROLE_LABELS[curNode.data.role]}
                </div>

                {/* 모델 비교 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{
                    fontSize: 12,
                    color: optNode.data.changed ? 'var(--teal-mid)' : 'var(--teal)',
                    textDecoration: optNode.data.changed ? 'line-through' : 'none',
                  }}>
                    {curNode.data.model}
                  </span>
                  {optNode.data.changed && (
                    <>
                      <span style={{ color: 'var(--teal)', fontSize: 12 }}>→</span>
                      <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>{optNode.data.model}</span>
                    </>
                  )}
                </div>

                {/* 비용 차이 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: optNode.data.changed ? 10 : 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--teal-mid)' }}>
                    ${curCost.toFixed(6)} → ${optCost.toFixed(6)}
                  </span>
                  {diff > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
                      -{(diff / curCost * 100).toFixed(0)}%
                    </span>
                  )}
                  {diff === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--teal-lite)' }}>최적 ✓</span>
                  )}
                </div>

                {/* 변경 이유 */}
                {optNode.data.changeReason && (
                  <div style={{
                    background: 'var(--bg-panel)',
                    borderRadius: 6, padding: '8px 10px',
                    fontSize: 11, color: 'var(--teal)', lineHeight: 1.7,
                    borderLeft: '2px solid var(--teal)',
                  }}>
                    {optNode.data.changeReason}
                  </div>
                )}

                {/* LLM 응답 (answer) */}
                {optNode.data.answer && (
                  <div style={{
                    background: 'var(--bg-panel)',
                    borderRadius: 6, padding: '8px 10px', marginTop: 6,
                    fontSize: 10, color: 'var(--teal-mid)', lineHeight: 1.6,
                    borderLeft: '2px solid var(--green-mid, #22c55e)',
                    maxHeight: 120, overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--teal)', letterSpacing: 1, marginBottom: 4 }}>💬 AI 응답</div>
                    {optNode.data.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 최적안 적용 버튼 */}
      {changedNodes.length > 0 && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--teal-dim)' }}>
          <button
            onClick={onApply}
            style={{
              width: '100%', padding: '12px',
              background: 'var(--teal)', border: '1px solid var(--teal)',
              borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 600, letterSpacing: 1,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ✓ 최적안 적용 ({changedNodes.length}개 노드 변경)
          </button>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--teal-dim)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--teal-mid)', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, color, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--teal-mid)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}
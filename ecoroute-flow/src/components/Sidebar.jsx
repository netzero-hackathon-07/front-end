const ROLES = ['orchestrator','planner','executor','reviewer','summarizer','critic','custom']
const ROLE_LABELS = {
  orchestrator: '오케스트레이터', planner: '플래너', executor: '익스큐터',
  reviewer: '리뷰어', summarizer: '서머라이저', critic: '크리틱', custom: '커스텀',
}
const DEFAULT_MODELS = [
  'claude-opus-4','claude-sonnet-4','claude-haiku-3-5',
  'gpt-4o','gpt-4o-mini','o3-mini','gemini-2.0-flash',
]

export default function Sidebar({ node, onUpdate, onDelete, calcCost, modelPrices, modelList }) {
  // API에서 가져온 모델 목록이 있으면 사용, 없으면 기본값
  const MODELS = modelList && modelList.length > 0
    ? modelList.filter(m => m.enabled).map(m => m.name)
    : DEFAULT_MODELS
  const { id, data } = node
  const callCount = data.callCount || 1
  const cost = calcCost(data.model, data.inputTokens, data.outputTokens, callCount)
  const price = modelPrices[data.model] || {}

  return (
    <div style={{
      width: 280, background: 'var(--bg-panel)',
      borderLeft: '2px solid var(--teal)',
      padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
      overflowY: 'auto', flexShrink: 0,
    }}>
      <div style={{ fontSize: 12, color: 'var(--teal)', letterSpacing: 3 }}>▸ 노드 편집</div>

      {/* 노드 이름 */}
      <div>
        <div style={labelStyle}>노드 이름</div>
        <input
          value={data.label}
          onChange={(e) => onUpdate(id, { label: e.target.value })}
          style={inputStyle}
        />
      </div>

      {/* 역할 */}
      <div>
        <div style={labelStyle}>역할</div>
        <select value={data.role} onChange={(e) => onUpdate(id, { role: e.target.value })} style={inputStyle}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {/* 모델 */}
      <div>
        <div style={labelStyle}>모델</div>
        <select value={data.model} onChange={(e) => onUpdate(id, { model: e.target.value })} style={inputStyle}>
          {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* 모델 가격 */}
      {price.input && (
        <div style={{ background: 'var(--teal-dim2)', border: '1px solid var(--teal-dim)', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: 'var(--teal-mid)', lineHeight: 2 }}>
          <span style={{ color: 'var(--teal)' }}>INPUT &nbsp;</span>${price.input} / 1M 토큰<br />
          <span style={{ color: 'var(--teal)' }}>OUTPUT </span>${price.output} / 1M 토큰
        </div>
      )}

      {/* 반복 횟수 */}
      <div>
        <div style={labelStyle}>반복 호출 횟수</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => onUpdate(id, { callCount: Math.max(1, callCount - 1) })}
            style={stepBtnStyle}
          >−</button>
          <div style={{
            flex: 1, textAlign: 'center',
            background: 'var(--teal-dim2)', border: '1px solid var(--teal-dim)',
            borderRadius: 6, padding: '8px',
            fontSize: 16, color: 'var(--teal)', fontWeight: 700,
          }}>
            × {callCount}
          </div>
          <button
            onClick={() => onUpdate(id, { callCount: callCount + 1 })}
            style={stepBtnStyle}
          >+</button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--teal-mid)', marginTop: 6, lineHeight: 1.6 }}>
          이 노드는 파이프라인에서 {callCount}회 호출됩니다.<br />
          토큰과 비용이 {callCount}배로 계산됩니다.
        </div>
      </div>

      {/* 예상 비용 */}
      <div style={{ background: 'var(--teal-dim2)', border: '1px solid var(--teal-dim)', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: 'var(--teal-mid)', letterSpacing: 2, marginBottom: 4 }}>이 노드 예상 비용</div>
        <div style={{ fontSize: 22, color: 'var(--green)', fontWeight: 700 }}>${cost.toFixed(6)}</div>
        <div style={{ fontSize: 10, color: 'var(--teal-mid)', marginTop: 4, lineHeight: 1.8 }}>
          IN {data.inputTokens.toLocaleString()} × {callCount}회<br />
          OUT {data.outputTokens.toLocaleString()} × {callCount}회<br />
          총 {((data.inputTokens + data.outputTokens) * callCount).toLocaleString()} 토큰
        </div>
      </div>

      {/* 삭제 */}
      <button
        onClick={() => onDelete(id)}
        style={{
          background: 'transparent', border: '1px solid #dc2626',
          borderRadius: 8, color: '#dc2626',
          padding: '8px', fontSize: 12, cursor: 'pointer', marginTop: 'auto',
        }}
      >
        🗑 노드 삭제
      </button>
    </div>
  )
}

const labelStyle = { fontSize: 10, color: 'var(--teal-mid)', letterSpacing: 2, marginBottom: 6 }
const inputStyle = {
  width: '100%', background: 'var(--teal-dim)', border: '1px solid var(--teal-dim2)',
  borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, outline: 'none',
  fontFamily: 'inherit',
}
const stepBtnStyle = {
  background: 'var(--teal-dim2)', border: '1px solid var(--teal-dim)', borderRadius: 6,
  color: 'var(--teal)', width: 36, height: 36, fontSize: 18,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
export default function TopBar({ onAddNode, totalCost, co2, trees, hasGenerated, showCompare, onToggleCompare }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 24px',
      background: 'var(--bg-panel)',
      borderBottom: '2px solid var(--teal)',
      flexShrink: 0,
    }}>
      {/* 로고 */}
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 6, color: 'var(--teal)' }}>
        ECO<span style={{ color: 'var(--green)' }}>ROUTE</span>
        <span style={{ fontSize: 11, color: 'var(--teal-mid)', marginLeft: 10, letterSpacing: 2, fontWeight: 400 }}>PIPELINE</span>
      </div>

      {/* 통계 */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--teal-mid)', letterSpacing: 2 }}>총 비용</div>
          <div style={{ fontSize: 16, color: 'var(--green)', fontWeight: 700 }}>${totalCost.toFixed(4)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--teal-mid)', letterSpacing: 2 }}>CO₂ 추정</div>
          <div style={{ fontSize: 16, color: 'var(--teal-lite)', fontWeight: 700 }}>{(co2 * 1000).toFixed(4)}g</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--teal-mid)', letterSpacing: 2 }}>나무 환산</div>
          <div style={{ fontSize: 16, color: 'var(--teal-lite)', fontWeight: 700 }}>🌳 ×{trees.toFixed(6)}</div>
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 10 }}>
        {hasGenerated && (
          <button
            onClick={onToggleCompare}
            style={{
              background: showCompare ? 'var(--teal)' : 'transparent',
              border: '1px solid var(--teal)',
              borderRadius: 8,
              color: showCompare ? '#fff' : 'var(--teal)',
              padding: '8px 20px', fontSize: 12,
              cursor: 'pointer', fontWeight: 600, letterSpacing: 1,
              transition: 'all .15s',
            }}
          >
            {showCompare ? '✕ 비교 닫기' : '⚡ 최적화 비교'}
          </button>
        )}
        <button
          onClick={onAddNode}
          style={{
            background: 'var(--teal)', border: '1px solid var(--teal)',
            borderRadius: 8, color: '#fff',
            padding: '8px 20px', fontSize: 12,
            cursor: 'pointer', fontWeight: 600, letterSpacing: 1,
          }}
        >
          + 노드 추가
        </button>
      </div>
    </div>
  )
}
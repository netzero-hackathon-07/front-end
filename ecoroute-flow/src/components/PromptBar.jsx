import { useState } from 'react'

export default function PromptBar({ onGenerate, generating }) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = () => {
    if (!prompt.trim() || generating) return
    onGenerate(prompt.trim())
    setPrompt('')
  }

  const EXAMPLES = [
    '계약서를 분석해서 법적 리스크 보고서 작성해줘',
    '파이썬 코드 리뷰하고 개선안 제안해줘',
    '회의록 요약해줘',
    '마케팅 기획서 작성해줘',
  ]

  return (
    <div style={{
      background: 'var(--bg-panel)',
      borderTop: '2px solid var(--teal)',
      padding: '14px 24px',
      flexShrink: 0,
    }}>
      {/* 예시 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--teal-mid)', letterSpacing: 2 }}>예시</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setPrompt(ex)}
            style={{
              background: 'var(--teal-dim)',
              border: '1px solid var(--teal-mid)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 11,
              color: 'var(--teal-mid)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.color = 'var(--teal)'; e.target.style.background = 'var(--teal-dim2)' }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--teal-mid)'; e.target.style.color = 'var(--teal-mid)'; e.target.style.background = 'var(--teal-dim)' }}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* 입력창 */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: 'var(--teal-dim2)',
          border: '1px solid var(--teal-dim)',
          borderTop: '2px solid var(--teal)',
          borderRadius: 8, padding: '10px 16px', gap: 10,
        }}>
          <span style={{ fontSize: 13, color: 'var(--teal)', flexShrink: 0 }}>▸</span>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="어떤 작업을 하고 싶으신가요? 현재 파이프라인을 분석하여 최적의 구성을 추천해드립니다."
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', fontSize: 14, color: '#e2e8f0',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || generating}
          style={{
            background: generating ? 'var(--teal-dim2)' : 'var(--teal)',
            border: `1px solid ${generating ? 'var(--teal-dim)' : 'var(--teal)'}`,
            borderRadius: 8, padding: '10px 24px', fontSize: 12,
            color: generating ? 'var(--teal-mid)' : '#fff',
            cursor: generating ? 'not-allowed' : 'pointer',
            fontWeight: 600, letterSpacing: 1,
            fontFamily: 'inherit',
            transition: 'all .15s', whiteSpace: 'nowrap',
          }}
        >
          {generating ? '분석 중...' : '▶ 최적화 추천'}
        </button>
      </div>
    </div>
  )
}
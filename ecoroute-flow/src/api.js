const BASE = import.meta.env.VITE_API_BASE

/**
 * 백엔드 응답 래퍼 처리 — { success, data, error } 형태를 언래핑
 */
async function unwrap(res) {
  const json = await res.json()
  if (json.success === false) {
    const msg = json.error?.message || `API error: ${res.status}`
    throw new Error(msg)
  }
  // 래퍼가 있으면 data 반환, 없으면 전체 반환
  return json.data !== undefined ? json.data : json
}

/**
 * 프론트엔드 → 백엔드 모델 이름 매핑
 */
const MODEL_NAME_TO_BACKEND = {
  'claude-haiku-3-5': 'claude-3-5-haiku',
  'o3-mini': 'o4-mini',
}

const MODEL_NAME_TO_FRONTEND = {
  'claude-3-5-haiku': 'claude-haiku-3-5',
  'o4-mini': 'o3-mini',
}

export function toBackendModelName(name) {
  return MODEL_NAME_TO_BACKEND[name] || name
}

export function toFrontendModelName(name) {
  return MODEL_NAME_TO_FRONTEND[name] || name
}

/**
 * GET /api/models/ — 등록된 모델 목록 조회
 */
export async function fetchModels() {
  const res = await fetch(`${BASE}/models/`)
  if (!res.ok) throw new Error(`fetchModels failed: ${res.status}`)
  return unwrap(res)
}

/**
 * GET /api/harness/roles — 지원되는 에이전트 역할 목록
 */
export async function fetchRoles() {
  const res = await fetch(`${BASE}/harness/roles`)
  if (!res.ok) throw new Error(`fetchRoles failed: ${res.status}`)
  return unwrap(res)
}

/**
 * POST /api/harness/analyze — 파이프라인 그래프 분석
 * @param {object} graph - { name, nodes: HarnessNode[], edges: HarnessEdge[] }
 * @returns {object} AnalysisResponse
 */
export async function analyzeHarness(graph) {
  const res = await fetch(`${BASE}/harness/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  })
  return unwrap(res)
}

/**
 * POST /api/harness/recommend — 최적화 추천
 * @param {object} payload - { graph, analysis_result, optimization_goal }
 * @returns {object} RecommendResponse
 */
export async function recommendHarness(payload) {
  const res = await fetch(`${BASE}/harness/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return unwrap(res)
}

/**
 * POST /api/models/compare — 모델 비교
 * @param {object} payload - { current_model, use_case_tag? }
 * @returns {object[]} ComparisonItem[]
 */
export async function compareModels(payload) {
  const res = await fetch(`${BASE}/models/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      current_model: toBackendModelName(payload.current_model),
    }),
  })
  return unwrap(res)
}

/**
 * 프론트엔드 노드/엣지를 백엔드 HarnessGraph 형태로 변환
 */
export function toHarnessGraph(name, nodes, edges) {
  return {
    name,
    nodes: nodes.map(n => ({
      id: n.id,
      label: n.data.label,
      role: n.data.role,
      model: toBackendModelName(n.data.model),
      estimated_input_tokens: n.data.inputTokens || 0,
      estimated_output_tokens: n.data.outputTokens || 0,
      system_prompt_tokens: 0,
      call_count: n.data.callCount || 1,
    })),
    edges: edges.map(e => ({
      id: e.id,
      source_node_id: e.source,
      target_node_id: e.target,
      data_transfer: 'context_pass',
      token_overhead: 0,
    })),
  }
}

/**
 * 백엔드 RecommendResponse를 프론트엔드 노드/엣지로 변환
 */
export function fromRecommendResponse(response, currentNodes) {
  const { recommended_graph, improvement_metrics } = response

  const cols = Math.ceil(recommended_graph.nodes.length / 2)
  const newNodes = recommended_graph.nodes.map((n, i) => {
    // 기존 노드에서 매칭되는 것을 찾아 위치 유지 시도
    const existing = currentNodes.find(cn => cn.id === n.id)
    return {
      id: n.id,
      type: 'agentNode',
      position: existing
        ? existing.position
        : { x: 120 + (i % cols) * 280, y: 150 + Math.floor(i / cols) * 220 },
      data: {
        role: n.role,
        model: toFrontendModelName(n.model),
        label: n.label,
        inputTokens: n.estimated_input_tokens,
        outputTokens: n.estimated_output_tokens,
        callCount: n.call_count || 1,
        reason: n.reason || null,
        answer: n.answer || null,
      },
    }
  })

  const newEdges = (recommended_graph.edges || []).map(e => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    animated: true,
    style: { stroke: '#2cbfbf' },
  }))

  return { nodes: newNodes, edges: newEdges, improvement_metrics }
}

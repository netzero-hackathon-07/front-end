import { useState, useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import AgentNode from './components/AgentNode'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import SummaryPanel from './components/SummaryPanel'
import PromptBar from './components/PromptBar'
import ComparePanel from './components/ComparePanel'
import { fetchModels, fetchRoles, analyzeHarness, recommendHarness, toHarnessGraph, fromRecommendResponse, toFrontendModelName } from './api'

const nodeTypes = { agentNode: AgentNode }

export const ROLE_TOKENS = {
  orchestrator: { inputTokens: 500, outputTokens: 200, callCount: 1 },
  planner:      { inputTokens: 400, outputTokens: 400, callCount: 1 },
  executor:     { inputTokens: 600, outputTokens: 500, callCount: 1 },
  reviewer:     { inputTokens: 700, outputTokens: 200, callCount: 1 },
  summarizer:   { inputTokens: 500, outputTokens: 150, callCount: 1 },
  critic:       { inputTokens: 600, outputTokens: 300, callCount: 1 },
  custom:       { inputTokens: 400, outputTokens: 200, callCount: 1 },
}

// 기본 가격 (API 로드 전 폴백)
export const MODEL_PRICES = {
  'claude-opus-4':    { input: 15.0,  output: 75.0  },
  'claude-sonnet-4':  { input: 3.0,   output: 15.0  },
  'claude-haiku-3-5': { input: 0.8,   output: 4.0   },
  'gpt-4o':           { input: 2.5,   output: 10.0  },
  'gpt-4o-mini':      { input: 0.15,  output: 0.6   },
  'gpt-4.1':          { input: 2.0,   output: 8.0   },
  'gpt-4.1-mini':     { input: 0.4,   output: 1.6   },
  'gpt-4.1-nano':     { input: 0.1,   output: 0.4   },
  'gpt-5':            { input: 1.25,  output: 10.0  },
  'gpt-5-mini':       { input: 0.25,  output: 2.0   },
  'o3':               { input: 2.0,   output: 8.0   },
  'o3-mini':          { input: 1.1,   output: 4.4   },
  'o4-mini':          { input: 1.1,   output: 4.4   },
  'gemini-2.0-flash': { input: 0.1,   output: 0.4   },
}

export function calcCost(model, inputTokens, outputTokens, callCount = 1, prices = MODEL_PRICES) {
  const price = prices[model]
  if (!price) return 0
  return ((inputTokens / 1_000_000 * price.input) + (outputTokens / 1_000_000 * price.output)) * callCount
}

const INITIAL_NODES = [
  { id: '1', type: 'agentNode', position: { x: 100, y: 200 }, data: { role: 'orchestrator', model: 'claude-sonnet-4',  label: 'Orchestrator', ...ROLE_TOKENS.orchestrator } },
  { id: '2', type: 'agentNode', position: { x: 380, y: 100 }, data: { role: 'planner',      model: 'gpt-4o-mini',      label: 'Planner',      ...ROLE_TOKENS.planner      } },
  { id: '3', type: 'agentNode', position: { x: 380, y: 320 }, data: { role: 'executor',     model: 'claude-haiku-3-5', label: 'Executor',     ...ROLE_TOKENS.executor     } },
  { id: '4', type: 'agentNode', position: { x: 660, y: 200 }, data: { role: 'reviewer',     model: 'gemini-2.0-flash', label: 'Reviewer',     ...ROLE_TOKENS.reviewer     } },
]

const INITIAL_EDGES = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#2cbfbf' } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#2cbfbf' } },
  { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#2cbfbf' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#2cbfbf' } },
]

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [selected, setSelected]         = useState(null)
  const [generating, setGenerating]     = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [showCompare, setShowCompare]   = useState(false)
  const [optimalNodes, setOptimalNodes] = useState([])
  const [optimalEdges, setOptimalEdges] = useState([])
  const [improvementMetrics, setImprovementMetrics] = useState(null)

  // 백엔드에서 가져온 모델 가격 정보
  const [modelPrices, setModelPrices] = useState(MODEL_PRICES)
  const [modelList, setModelList]     = useState([])
  const [roles, setRoles]             = useState([])

  // 백엔드 분석 결과
  const [analysis, setAnalysis] = useState(null)

  // 분석 디바운스 ref
  const analyzeTimeout = useRef(null)

  // 초기 로딩: 모델 목록 및 역할 정보를 백엔드에서 가져옴
  useEffect(() => {
    fetchModels()
      .then(models => {
        setModelList(models)
        // API 모델 데이터로 가격표 업데이트
        const prices = { ...MODEL_PRICES }
        models.forEach(m => {
          if (m.input_usd_per_1m_tokens != null && m.output_usd_per_1m_tokens != null) {
            // 백엔드 이름과 프론트엔드 이름 모두에 가격 매핑
            prices[m.name] = {
              input: m.input_usd_per_1m_tokens,
              output: m.output_usd_per_1m_tokens,
            }
            const frontendName = toFrontendModelName(m.name)
            if (frontendName !== m.name) {
              prices[frontendName] = prices[m.name]
            }
          }
        })
        setModelPrices(prices)
      })
      .catch(err => console.warn('모델 목록 로드 실패, 기본값 사용:', err))

    fetchRoles()
      .then(setRoles)
      .catch(err => console.warn('역할 정보 로드 실패:', err))
  }, [])

  // 노드/엣지 변경 시 백엔드로 분석 요청 (디바운스)
  useEffect(() => {
    if (nodes.length === 0) return
    if (analyzeTimeout.current) clearTimeout(analyzeTimeout.current)

    analyzeTimeout.current = setTimeout(() => {
      const graph = toHarnessGraph('current-pipeline', nodes, edges)
      analyzeHarness(graph)
        .then(result => setAnalysis(result))
        .catch(err => console.warn('분석 요청 실패:', err))
    }, 500)

    return () => {
      if (analyzeTimeout.current) clearTimeout(analyzeTimeout.current)
    }
  }, [nodes, edges])

  const calcCostWithPrices = useCallback((model, inputTokens, outputTokens, callCount = 1) => {
    return calcCost(model, inputTokens, outputTokens, callCount, modelPrices)
  }, [modelPrices])

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#2cbfbf' } }, eds)),
    [setEdges]
  )
  const onNodeClick       = useCallback((_, node) => setSelected(node), [])
  const onPaneClick       = useCallback(() => setSelected(null), [])
  const onEdgeDoubleClick = useCallback((_, edge) => {
    setEdges((eds) => eds.filter((e) => e.id !== edge.id))
  }, [setEdges])

  const updateNode = useCallback((id, newData) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id !== id) return n
      const tokens = newData.role ? ROLE_TOKENS[newData.role] : {}
      return { ...n, data: { ...n.data, ...newData, ...tokens } }
    }))
    setSelected((prev) => {
      if (prev?.id !== id) return prev
      const tokens = newData.role ? ROLE_TOKENS[newData.role] : {}
      return { ...prev, data: { ...prev.data, ...newData, ...tokens } }
    })
  }, [setNodes])

  const addNode = useCallback(() => {
    const id = String(Date.now())
    setNodes((nds) => [...nds, {
      id, type: 'agentNode',
      position: { x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 },
      data: { role: 'executor', model: 'claude-haiku-3-5', label: '새 노드', ...ROLE_TOKENS.executor },
    }])
  }, [setNodes])

  const deleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    setSelected(null)
  }, [setNodes, setEdges])

  // 파이프라인 생성 — 현재 유저 파이프라인을 백엔드에 보내 LLM 추천을 받음
  // 유저의 그래프는 그대로 유지하고, 추천 결과만 저장해서 비교 가능하게 함
  const handleGenerate = useCallback(async (prompt) => {
    setGenerating(true)
    setSelected(null)
    setShowCompare(false)

    try {
      // 현재 그래프를 분석
      const graph = toHarnessGraph(prompt || 'user-pipeline', nodes, edges)
      const analysisResult = await analyzeHarness(graph)

      // 분석 결과 + 프롬프트로 최적화 추천 요청
      const recommendation = await recommendHarness({
        graph,
        analysis_result: analysisResult,
        optimization_goal: 'balanced',
      })

      const { nodes: recNodes, edges: recEdges, improvement_metrics } = fromRecommendResponse(recommendation, nodes)

      // 추천 노드에 변경 표시 추가 (ECOCACHE reason/answer 포함)
      const optNodes = recNodes.map(rn => {
        const original = nodes.find(n => n.id === rn.id)
        const changed = original ? original.data.model !== rn.data.model : true
        return {
          ...rn,
          data: {
            ...rn.data,
            isOptimal: true,
            changed,
            originalModel: original?.data.model,
            changeReason: rn.data.reason || (changed ? `비용과 탄소 절감을 위해 ${rn.data.model}로 변경을 추천합니다.` : '현재 모델이 최적입니다.'),
            answer: rn.data.answer || null,
          },
        }
      })

      setOptimalNodes(optNodes)
      setOptimalEdges(recEdges)
      setImprovementMetrics(improvement_metrics)
      setHasGenerated(true)
    } catch (err) {
      console.error('추천 요청 실패:', err)
      // 폴백: 클라이언트 측 최적화 로직
      const ROLE_BEST_MODEL = {
        orchestrator: 'claude-sonnet-4',
        planner: 'gpt-4o-mini',
        executor: 'claude-haiku-3-5',
        reviewer: 'gpt-4o-mini',
        summarizer: 'gemini-2.0-flash',
        critic: 'gpt-4o',
        custom: 'claude-haiku-3-5',
      }
      const optNodes = nodes.map(node => {
        const bestModel = ROLE_BEST_MODEL[node.data.role] || 'claude-haiku-3-5'
        const changed = node.data.model !== bestModel
        return {
          ...node,
          data: {
            ...node.data,
            model: bestModel,
            isOptimal: true,
            changed,
            originalModel: node.data.model,
            changeReason: changed ? `역할에 최적화된 모델로 변경 추천` : '현재 모델이 최적입니다.',
          },
        }
      })
      setOptimalNodes(optNodes)
      setOptimalEdges(edges)
      setImprovementMetrics(null)
      setHasGenerated(true)
    } finally {
      setGenerating(false)
    }
  }, [nodes, edges])

  // 최적화 비교 패널 토글 — 이미 추천 결과가 있으므로 패널만 열고 닫음
  const handleToggleCompare = useCallback(() => {
    setShowCompare(v => !v)
  }, [])

  const applyOptimal = useCallback(() => {
    setNodes(optimalNodes.map(n => ({
      ...n,
      data: { ...n.data, isOptimal: false, changed: false, originalModel: undefined, changeReason: undefined }
    })))
    if (optimalEdges.length > 0) {
      setEdges(optimalEdges)
    }
    setShowCompare(false)
  }, [optimalNodes, optimalEdges, setNodes, setEdges])

  // 비용/탄소 계산 — 백엔드 분석 결과가 있으면 사용, 없으면 클라이언트 계산
  const totalCost   = analysis?.summary?.total_cost_usd
    ?? nodes.reduce((sum, n) => sum + calcCostWithPrices(n.data.model, n.data.inputTokens, n.data.outputTokens, n.data.callCount), 0)
  const totalTokens = analysis?.summary?.total_tokens
    ?? nodes.reduce((sum, n) => sum + (n.data.inputTokens + n.data.outputTokens) * (n.data.callCount || 1), 0)
  const co2         = analysis?.summary?.total_co2_kg ?? (totalTokens / 1_000_000) * 0.3 * 0.4
  const trees       = analysis?.summary?.trees_equivalent ?? co2 / 21.77

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f1117' }}>
      <TopBar
        onAddNode={addNode}
        totalCost={totalCost}
        co2={co2}
        trees={trees}
        hasGenerated={hasGenerated}
        showCompare={showCompare}
        onToggleCompare={handleToggleCompare}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <SummaryPanel
          nodes={nodes}
          totalCost={totalCost}
          co2={co2}
          trees={trees}
          calcCost={calcCostWithPrices}
          analysis={analysis}
        />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#1e2533" gap={24} />
          <Controls style={{ background: '#1a2035', border: '1px solid #2a3550' }} />
          <MiniMap style={{ background: '#1a2035', border: '1px solid #2a3550' }} nodeColor="#2cbfbf" />
        </ReactFlow>

        {generating && (
          <div style={{
            position: 'absolute', inset: 0, background: '#0f111788',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#2cbfbf', letterSpacing: 3, marginBottom: 16 }}>GENERATING PIPELINE</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: '50%', background: '#2cbfbf',
                    animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {selected && !showCompare && (
          <Sidebar
            node={selected}
            onUpdate={updateNode}
            onDelete={deleteNode}
            calcCost={calcCostWithPrices}
            modelPrices={modelPrices}
            modelList={modelList}
          />
        )}

        {showCompare && (
          <ComparePanel
            currentNodes={nodes}
            optimalNodes={optimalNodes}
            calcCost={calcCostWithPrices}
            onApply={applyOptimal}
            onClose={() => setShowCompare(false)}
            improvementMetrics={improvementMetrics}
          />
        )}
      </div>

      <PromptBar onGenerate={handleGenerate} generating={generating} />

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

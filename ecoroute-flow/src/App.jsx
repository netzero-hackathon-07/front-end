import { useState, useCallback } from 'react'
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

export const MODEL_PRICES = {
  'claude-opus-4':    { input: 15.0,  output: 75.0  },
  'claude-sonnet-4':  { input: 3.0,   output: 15.0  },
  'claude-haiku-3-5': { input: 0.8,   output: 4.0   },
  'gpt-4o':           { input: 2.5,   output: 10.0  },
  'gpt-4o-mini':      { input: 0.15,  output: 0.6   },
  'o3-mini':          { input: 1.1,   output: 4.4   },
  'gemini-2.0-flash': { input: 0.1,   output: 0.4   },
}

export function calcCost(model, inputTokens, outputTokens, callCount = 1) {
  const price = MODEL_PRICES[model]
  if (!price) return 0
  return ((inputTokens / 1_000_000 * price.input) + (outputTokens / 1_000_000 * price.output)) * callCount
}

const ROLE_BEST_MODEL = {
  orchestrator: { model: 'claude-sonnet-4',  reason: 'Orchestrator는 전체 파이프라인을 지휘하는 역할로, 복잡한 추론보다 명확한 지시와 계획이 중요합니다. Claude Sonnet 4는 instruction following과 전체적인 흐름 파악에 강점이 있으며, Opus 대비 80% 저렴합니다.' },
  planner:      { model: 'gpt-4o-mini',      reason: 'Planner는 구체적인 실행 계획을 수립하는 역할입니다. 창의성보다 논리적 구조화가 중요하므로, GPT-4o-mini처럼 빠르고 저렴한 모델로도 충분한 품질을 낼 수 있습니다.' },
  executor:     { model: 'claude-haiku-3-5', reason: 'Executor는 반복적인 실행 작업을 담당합니다. 고성능 모델이 필요하지 않으며, Claude Haiku는 빠른 응답속도와 낮은 비용으로 동일한 작업을 약 85% 저렴하게 처리합니다.' },
  reviewer:     { model: 'gpt-4o-mini',      reason: 'Reviewer는 결과물의 품질을 검토하는 역할입니다. 정확한 판단이 필요하지만 최고급 모델까지는 필요하지 않습니다. GPT-4o-mini는 리뷰 작업에서 비용 대비 우수한 성능을 보입니다.' },
  summarizer:   { model: 'gemini-2.0-flash', reason: 'Summarizer는 핵심 내용을 정리하는 단순한 역할입니다. Gemini 2.0 Flash는 요약 작업에 최적화되어 있으며, 가장 저렴한 비용으로 빠른 처리가 가능합니다.' },
  critic:       { model: 'gpt-4o',           reason: 'Critic은 결과물의 약점을 날카롭게 분석하는 역할로, 깊은 추론 능력이 필요합니다. GPT-4o는 비판적 분석에서 높은 정확도를 보이며, Opus 대비 합리적인 비용입니다.' },
  custom:       { model: 'claude-haiku-3-5', reason: '커스텀 역할의 경우 기본적으로 경량 모델을 추천합니다. 역할의 특성에 따라 수동으로 모델을 변경하세요.' },
}

function generateOptimal(currentNodes) {
  return currentNodes.map(node => {
    const best = ROLE_BEST_MODEL[node.data.role] || ROLE_BEST_MODEL.custom
    const changed = node.data.model !== best.model
    return {
      ...node,
      data: {
        ...node.data,
        model: best.model,
        isOptimal: true,
        changed,
        changeReason: changed ? best.reason : '현재 선택하신 모델이 이 역할에 최적입니다.',
        originalModel: node.data.model,
      }
    }
  })
}

function generatePipeline(prompt) {
  const p = prompt.toLowerCase()
  const isCode     = p.includes('코드') || p.includes('프로그램') || p.includes('구현') || p.includes('code')
  const isAnalysis = p.includes('분석') || p.includes('리스크') || p.includes('검토') || p.includes('법')
  const isCreative = p.includes('작성') || p.includes('글') || p.includes('보고서') || p.includes('기획')
  const isSimple   = p.includes('요약') || p.includes('번역') || p.includes('정리')

  let template

  if (isCode) {
    template = {
      nodes: [
        { role: 'orchestrator', model: 'claude-sonnet-4',  label: 'Orchestrator' },
        { role: 'planner',      model: 'gpt-4o-mini',      label: 'Planner'      },
        { role: 'executor',     model: 'claude-haiku-3-5', label: 'Executor'     },
        { role: 'reviewer',     model: 'gpt-4o',           label: 'Reviewer'     },
      ],
      edges: [[0,1],[0,2],[1,3],[2,3]],
    }
  } else if (isAnalysis) {
    template = {
      nodes: [
        { role: 'orchestrator', model: 'claude-sonnet-4',  label: 'Orchestrator' },
        { role: 'planner',      model: 'claude-sonnet-4',  label: 'Planner'      },
        { role: 'executor',     model: 'gpt-4o-mini',      label: 'Executor'     },
        { role: 'critic',       model: 'gpt-4o',           label: 'Critic'       },
        { role: 'reviewer',     model: 'claude-haiku-3-5', label: 'Reviewer'     },
      ],
      edges: [[0,1],[1,2],[2,3],[3,4]],
    }
  } else if (isCreative) {
    template = {
      nodes: [
        { role: 'orchestrator', model: 'claude-sonnet-4',  label: 'Orchestrator' },
        { role: 'planner',      model: 'gpt-4o-mini',      label: 'Planner'      },
        { role: 'executor',     model: 'claude-sonnet-4',  label: 'Executor'     },
        { role: 'reviewer',     model: 'claude-haiku-3-5', label: 'Reviewer'     },
        { role: 'summarizer',   model: 'gemini-2.0-flash', label: 'Summarizer'   },
      ],
      edges: [[0,1],[1,2],[2,3],[3,4]],
    }
  } else if (isSimple) {
    template = {
      nodes: [
        { role: 'orchestrator', model: 'claude-haiku-3-5', label: 'Orchestrator' },
        { role: 'executor',     model: 'gemini-2.0-flash', label: 'Executor'     },
        { role: 'summarizer',   model: 'claude-haiku-3-5', label: 'Summarizer'   },
      ],
      edges: [[0,1],[1,2]],
    }
  } else {
    template = {
      nodes: [
        { role: 'orchestrator', model: 'claude-sonnet-4',  label: 'Orchestrator' },
        { role: 'executor',     model: 'claude-haiku-3-5', label: 'Executor'     },
        { role: 'reviewer',     model: 'gpt-4o-mini',      label: 'Reviewer'     },
      ],
      edges: [[0,1],[1,2]],
    }
  }

  const cols = Math.ceil(template.nodes.length / 2)
  const newNodes = template.nodes.map((n, i) => ({
    id: String(Date.now() + i),
    type: 'agentNode',
    position: {
      x: 120 + (i % cols) * 280,
      y: 150 + Math.floor(i / cols) * 220,
    },
    data: { ...n, ...ROLE_TOKENS[n.role] },
  }))

  const newEdges = template.edges.map(([s, t], i) => ({
    id: `e-gen-${Date.now()}-${i}`,
    source: newNodes[s].id,
    target: newNodes[t].id,
    animated: true,
    style: { stroke: '#2cbfbf' },
  }))

  return { nodes: newNodes, edges: newEdges }
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

  const handleGenerate = useCallback((prompt) => {
    setGenerating(true)
    setSelected(null)
    setShowCompare(false)
    setTimeout(() => {
      const { nodes: newNodes, edges: newEdges } = generatePipeline(prompt)
      setNodes(newNodes)
      setEdges(newEdges)
      setOptimalNodes(generateOptimal(newNodes))
      setHasGenerated(true)
      setGenerating(false)
    }, 800)
  }, [setNodes, setEdges])

  const applyOptimal = useCallback(() => {
    setNodes(optimalNodes.map(n => ({
      ...n,
      data: { ...n.data, isOptimal: false, changed: false, originalModel: undefined }
    })))
    setShowCompare(false)
  }, [optimalNodes, setNodes])

  // callCount 반영된 비용/탄소 계산
  const totalCost   = nodes.reduce((sum, n) => sum + calcCost(n.data.model, n.data.inputTokens, n.data.outputTokens, n.data.callCount), 0)
  const totalTokens = nodes.reduce((sum, n) => sum + (n.data.inputTokens + n.data.outputTokens) * (n.data.callCount || 1), 0)
  const co2         = (totalTokens / 1_000_000) * 0.3 * 0.4
  const trees       = co2 / 21.77

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f1117' }}>
      <TopBar
        onAddNode={addNode}
        totalCost={totalCost}
        co2={co2}
        trees={trees}
        hasGenerated={hasGenerated}
        showCompare={showCompare}
        onToggleCompare={() => setShowCompare(v => !v)}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <SummaryPanel nodes={nodes} totalCost={totalCost} co2={co2} trees={trees} calcCost={calcCost} />
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
          <Sidebar node={selected} onUpdate={updateNode} onDelete={deleteNode} calcCost={calcCost} modelPrices={MODEL_PRICES} />
        )}

        {showCompare && (
          <ComparePanel
            currentNodes={nodes}
            optimalNodes={optimalNodes}
            calcCost={calcCost}
            onApply={applyOptimal}
            onClose={() => setShowCompare(false)}
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
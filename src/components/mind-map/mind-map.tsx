'use client'

import { useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  OnSelectionChangeParams
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { MindMapNode } from './mind-map-node'
import { MindMapToolbar } from './mind-map-toolbar'
import { AIAssistant } from '@/components/ai/ai-assistant'

const nodeTypes = {
  mindMapNode: MindMapNode,
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'mindMapNode',
    position: { x: 400, y: 300 },
    data: { 
      content: '中心主题',
      isEditing: false
    },
  },
]

const initialEdges: Edge[] = []

export interface MindMapProps {
  initialData?: {
    nodes: Node[]
    edges: Edge[]
  }
  onSave?: (data: { nodes: Node[], edges: Edge[] }) => void
  className?: string
}

export function MindMap({ initialData, onSave, className = '' }: MindMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialData?.nodes || initialNodes
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialData?.edges || initialEdges
  )
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [selectedEdges, setSelectedEdges] = useState<string[]>([])
  const [showAIAssistant, setShowAIAssistant] = useState(false)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelectedNodes(params.nodes.map(node => node.id))
    setSelectedEdges(params.edges.map(edge => edge.id))
  }, [])

  const addNode = useCallback(() => {
    const newId = `node_${Date.now()}`
    const newNode: Node = {
      id: newId,
      type: 'mindMapNode',
      position: { 
        x: Math.random() * 500 + 250, 
        y: Math.random() * 300 + 150 
      },
      data: { 
        content: '新节点',
        isEditing: true
      },
    }
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !selectedNodes.includes(node.id)))
    setEdges((eds) => eds.filter((edge) => 
      !selectedEdges.includes(edge.id) &&
      !selectedNodes.includes(edge.source) &&
      !selectedNodes.includes(edge.target)
    ))
  }, [selectedNodes, selectedEdges, setNodes, setEdges])

  const updateNodeContent = useCallback((nodeId: string, content: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, content } }
          : node
      )
    )
  }, [setNodes])


  const handleSave = useCallback(() => {
    onSave?.({ nodes, edges })
  }, [nodes, edges, onSave])

  const handleAISuggestionApply = useCallback((suggestion: {
    type: string
    content?: string
    position?: { x: number; y: number }
    connections?: string[]
  }) => {
    if (suggestion.type === 'node' && suggestion.content) {
      const newId = `ai_node_${Date.now()}`
      const newNode: Node = {
        id: newId,
        type: 'mindMapNode',
        position: suggestion.position || { 
          x: Math.random() * 400 + 200, 
          y: Math.random() * 300 + 150 
        },
        data: { 
          content: suggestion.content,
          isEditing: false
        },
      }
      
      setNodes((nds) => [...nds, newNode])
      
      // 如果有连接建议，创建连接
      if (suggestion.connections && suggestion.connections.length > 0) {
        const newEdges = suggestion.connections.map((targetId: string, index: number) => ({
          id: `ai_edge_${newId}_${targetId}_${index}`,
          source: newId,
          target: targetId
        }))
        setEdges((eds) => [...eds, ...newEdges])
      }
    }
  }, [setNodes, setEdges])

  const selectedNode = selectedNodes.length === 1 
    ? nodes.find(n => n.id === selectedNodes[0])
    : undefined

  // 监听节点内容更新事件
  useEffect(() => {
    const handleNodeContentUpdate = (event: CustomEvent) => {
      const { nodeId, content } = event.detail
      updateNodeContent(nodeId, content)
    }

    window.addEventListener('nodeContentUpdate', handleNodeContentUpdate as EventListener)
    
    return () => {
      window.removeEventListener('nodeContentUpdate', handleNodeContentUpdate as EventListener)
    }
  }, [updateNodeContent])

  return (
    <div className={`w-full h-full relative ${className}`}>
      <MindMapToolbar
        onAddNode={addNode}
        onDeleteSelected={deleteSelected}
        onSave={handleSave}
        onAIAssist={() => setShowAIAssistant(true)}
        hasSelection={selectedNodes.length > 0 || selectedEdges.length > 0}
      />
      
      {showAIAssistant && (
        <AIAssistant
          selectedNode={selectedNode ? {
            id: selectedNode.id,
            content: String(selectedNode.data.content || '')
          } : undefined}
          allNodes={nodes.map(n => ({
            id: n.id,
            content: String(n.data.content || '')
          }))}
          onSuggestionApply={handleAISuggestionApply}
          onClose={() => setShowAIAssistant(false)}
        />
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Controls />
        <MiniMap />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={12} 
          size={1}
          color="#e2e8f0"
        />
      </ReactFlow>
    </div>
  )
}
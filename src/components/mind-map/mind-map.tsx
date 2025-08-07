'use client'

import { useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  BackgroundVariant,
  OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { MindMapNode } from './mind-map-node'
import { MindMapToolbar } from './mind-map-toolbar'
import { AIAssistant } from '@/components/ai/ai-assistant'
import { 
  calculateAutoLayout, 
  generateEdges, 
  getNextSortOrder, 
  getNodeLevel,
  type LayoutNode 
} from '@/lib/auto-layout'
import { MindMapService } from '@/lib/database'

const nodeTypes = {
  mindMapNode: MindMapNode,
}

const initialNodes: Node[] = []

const initialEdges: Edge[] = []

export interface MindMapProps {
  initialData?: {
    nodes: Node[]
    edges: Edge[]
  }
  onSave?: (data: { nodes: Node[]; edges: Edge[] }) => void
  className?: string
}

export function MindMap({ initialData, onSave, className = '' }: MindMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || initialEdges)
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [selectedEdges, setSelectedEdges] = useState<string[]>([])
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([])
  const [mindMapId] = useState<string>('temp-mindmap-id') // 临时ID，后续需要从props或路由获取


  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelectedNodes(params.nodes.map(node => node.id))
    setSelectedEdges(params.edges.map(edge => edge.id))
  }, [])

  // 应用自动布局
  const applyAutoLayout = useCallback((layoutNodesList: LayoutNode[]) => {
    const positions = calculateAutoLayout(layoutNodesList)
    const autoEdges = generateEdges(layoutNodesList)
    
    // 更新ReactFlow节点
    const reactFlowNodes: Node[] = layoutNodesList.map(layoutNode => ({
      id: layoutNode.id,
      type: 'mindMapNode',
      position: positions[layoutNode.id] || { x: 0, y: 0 },
      data: {
        content: layoutNode.content,
        isEditing: false,
      },
    }))
    
    // 更新ReactFlow边
    const reactFlowEdges: Edge[] = autoEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'default',
    }))
    
    setNodes(reactFlowNodes)
    setEdges(reactFlowEdges)
  }, [setNodes, setEdges])

  const addNode = useCallback(async () => {
    try {
      const selectedNodeId = selectedNodes.length === 1 ? selectedNodes[0] : null
      const parentNodeId = selectedNodeId
      const sortOrder = getNextSortOrder(layoutNodes, parentNodeId)
      const nodeLevel = getNodeLevel(layoutNodes, parentNodeId)
      
      // 创建新的布局节点
      const newLayoutNode: LayoutNode = {
        id: crypto.randomUUID(),
        parent_node_id: parentNodeId,
        sort_order: sortOrder,
        node_level: nodeLevel,
        content: '新节点',
      }
      
      // 更新布局节点列表
      const updatedLayoutNodes = [...layoutNodes, newLayoutNode]
      setLayoutNodes(updatedLayoutNodes)
      
      // 应用自动布局
      applyAutoLayout(updatedLayoutNodes)
      
      // 如果添加的是子节点，保持父节点选中状态
      if (parentNodeId) {
        // 延迟设置选中状态，确保节点已经渲染完成
        setTimeout(() => {
          setSelectedNodes([parentNodeId])
        }, 100)
      } else {
        // 如果是根节点，选中新创建的节点
        setTimeout(() => {
          setSelectedNodes([newLayoutNode.id])
        }, 100)
      }
      
      // 保存到数据库
      try {
        await MindMapService.upsertNodes([{
          id: newLayoutNode.id,
          mind_map_id: mindMapId,
          content: newLayoutNode.content,
          parent_node_id: newLayoutNode.parent_node_id,
          sort_order: newLayoutNode.sort_order,
          node_level: newLayoutNode.node_level,
        }])
      } catch (dbError) {
        console.error('保存节点到数据库失败:', dbError)
        // 可以在这里添加用户友好的错误提示
      }
      
    } catch (error) {
      console.error('添加节点失败:', error)
    }
  }, [selectedNodes, layoutNodes, mindMapId, applyAutoLayout])

  const deleteSelected = useCallback(async () => {
    if (selectedNodes.length === 0) return
    
    try {
      // 从数据库删除节点
      await MindMapService.deleteNodes(mindMapId, selectedNodes)
      
      // 更新布局节点数据
      const updatedLayoutNodes = layoutNodes.filter(node => !selectedNodes.includes(node.id))
      setLayoutNodes(updatedLayoutNodes)
      
      // 重新应用布局
      applyAutoLayout(updatedLayoutNodes)
      
    } catch (error) {
      console.error('删除节点失败:', error)
    }
  }, [selectedNodes, layoutNodes, mindMapId, applyAutoLayout])

  const updateNodeContent = useCallback(
    async (nodeId: string, content: string) => {
      // 更新ReactFlow节点
      setNodes(nds =>
        nds.map(node => (node.id === nodeId ? { ...node, data: { ...node.data, content } } : node))
      )
      
      // 更新布局节点数据
      const updatedLayoutNodes = layoutNodes.map(node => 
        node.id === nodeId ? { ...node, content } : node
      )
      setLayoutNodes(updatedLayoutNodes)
      
      // 保存到数据库
      try {
        const nodeToUpdate = updatedLayoutNodes.find(node => node.id === nodeId)
        if (nodeToUpdate) {
          await MindMapService.upsertNodes([{
            id: nodeToUpdate.id,
            mind_map_id: mindMapId,
            content: nodeToUpdate.content,
            parent_node_id: nodeToUpdate.parent_node_id,
            sort_order: nodeToUpdate.sort_order,
            node_level: nodeToUpdate.node_level,
          }])
        }
      } catch (error) {
        console.error('更新节点内容到数据库失败:', error)
      }
    },
    [setNodes, layoutNodes, mindMapId]
  )


  const handleSave = useCallback(async () => {
    try {
      // 保存所有节点的最新内容到数据库
      if (layoutNodes.length > 0) {
        const dbNodes = layoutNodes.map(node => ({
          id: node.id,
          mind_map_id: mindMapId,
          content: node.content,
          parent_node_id: node.parent_node_id,
          sort_order: node.sort_order,
          node_level: node.node_level,
        }))
        await MindMapService.upsertNodes(dbNodes)
      }
      
      onSave?.({ nodes, edges })
    } catch (error) {
      console.error('保存思维导图失败:', error)
    }
  }, [nodes, edges, onSave, layoutNodes, mindMapId])

  const handleAISuggestionApply = useCallback(
    (suggestion: {
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
            y: Math.random() * 300 + 150,
          },
          data: {
            content: suggestion.content,
            isEditing: false,
          },
        }

        setNodes(nds => [...nds, newNode])

        // 如果有连接建议，创建连接
        if (suggestion.connections && suggestion.connections.length > 0) {
          const newEdges = suggestion.connections.map((targetId: string, index: number) => ({
            id: `ai_edge_${newId}_${targetId}_${index}`,
            source: newId,
            target: targetId,
          }))
          setEdges(eds => [...eds, ...newEdges])
        }
      }
    },
    [setNodes, setEdges]
  )

  const selectedNode =
    selectedNodes.length === 1 ? nodes.find(n => n.id === selectedNodes[0]) : undefined

  // 初始化默认根节点
  useEffect(() => {
    if (layoutNodes.length === 0 && (!initialData?.nodes || initialData.nodes.length === 0)) {
      const rootNode: LayoutNode = {
        id: crypto.randomUUID(),
        parent_node_id: null,
        sort_order: 0,
        node_level: 0,
        content: '中心主题',
      }
      setLayoutNodes([rootNode])
      applyAutoLayout([rootNode])
    }
  }, [layoutNodes.length, initialData?.nodes, applyAutoLayout])
  
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
        selectedNodeCount={selectedNodes.length}
      />

      {showAIAssistant && (
        <AIAssistant
          selectedNode={
            selectedNode
              ? {
                  id: selectedNode.id,
                  content: String(selectedNode.data.content || ''),
                }
              : undefined
          }
          allNodes={nodes.map(n => ({
            id: n.id,
            content: String(n.data.content || ''),
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
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#e2e8f0" />
      </ReactFlow>
    </div>
  )
}

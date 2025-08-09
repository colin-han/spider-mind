'use client'

import { useCallback, useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
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
  type LayoutNode,
} from '@/lib/auto-layout'
// 移除数据库直接访问，组件应该通过API调用进行数据操作

const nodeTypes = {
  mindMapNode: MindMapNode,
}

const initialNodes: Node[] = []

const initialEdges: Edge[] = []

export interface MindMapRef {
  addNode: () => void
  deleteSelected: () => void
  save: () => void
}

export interface MindMapProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  initialData?: {
    nodes: Node[]
    edges: Edge[]
  }
  onChange?: (data: { nodes: Node[]; edges: Edge[] }) => void
  onSave?: (data: { nodes: Node[]; edges: Edge[] }) => void
  onSelectionChange?: (selectedNodes: string[]) => void
  showToolbar?: boolean
  className?: string
}

const MindMapComponent = forwardRef<MindMapRef, MindMapProps>(
  (
    {
      initialNodes: propInitialNodes,
      initialEdges: propInitialEdges,
      initialData,
      onChange,
      onSave,
      onSelectionChange,
      showToolbar = true,
      className = '',
    },
    ref
  ) => {
    const finalInitialNodes = propInitialNodes || initialData?.nodes || initialNodes
    const finalInitialEdges = propInitialEdges || initialData?.edges || initialEdges

    const [nodes, setNodes, onNodesChange] = useNodesState(finalInitialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(finalInitialEdges)
    const [selectedNodes, setSelectedNodes] = useState<string[]>([])
    const [selectedEdges, setSelectedEdges] = useState<string[]>([])
    const [showAIAssistant, setShowAIAssistant] = useState(false)
    const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([])
    // 移除未使用的mindMapId状态

    const onSelectionChangeRef = useRef(onSelectionChange)
    onSelectionChangeRef.current = onSelectionChange

    const onSelectionChangeCallback = useCallback((params: OnSelectionChangeParams) => {
      const nodeIds = params.nodes.map(node => node.id)
      const edgeIds = params.edges.map(edge => edge.id)
      setSelectedNodes(nodeIds)
      setSelectedEdges(edgeIds)
      onSelectionChangeRef.current?.(nodeIds)
    }, [])

    // 应用自动布局
    const applyAutoLayout = useCallback(
      (layoutNodesList: LayoutNode[]) => {
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

        // 通知父组件数据变化
        const data = { nodes: reactFlowNodes, edges: reactFlowEdges }
        onChange?.(data)
      },
      [setNodes, setEdges, onChange]
    )

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
            // 确保ReactFlow也知道这个选择状态
            setNodes(prevNodes =>
              prevNodes.map(node => ({
                ...node,
                selected: node.id === parentNodeId,
              }))
            )
          }, 100)
        } else {
          // 如果是根节点，选中新创建的节点
          setTimeout(() => {
            setSelectedNodes([newLayoutNode.id])
            // 确保ReactFlow也知道这个选择状态
            setNodes(prevNodes =>
              prevNodes.map(node => ({
                ...node,
                selected: node.id === newLayoutNode.id,
              }))
            )
          }, 100)
        }

        // TODO: 通过API保存节点数据，而不是直接调用数据库
        // 当前由页面级的onChange处理保存逻辑
      } catch (error) {
        console.error('添加节点失败:', error)
      }
    }, [selectedNodes, layoutNodes, applyAutoLayout])

    const deleteSelected = useCallback(async () => {
      if (selectedNodes.length === 0) return

      try {
        // TODO: 通过API删除节点，而不是直接调用数据库

        // 更新布局节点数据
        const updatedLayoutNodes = layoutNodes.filter(node => !selectedNodes.includes(node.id))
        setLayoutNodes(updatedLayoutNodes)

        // 重新应用布局
        applyAutoLayout(updatedLayoutNodes)
      } catch (error) {
        console.error('删除节点失败:', error)
      }
    }, [selectedNodes, layoutNodes, applyAutoLayout])

    const updateNodeContent = useCallback(
      async (nodeId: string, content: string) => {
        // 更新ReactFlow节点
        setNodes(nds =>
          nds.map(node =>
            node.id === nodeId ? { ...node, data: { ...node.data, content } } : node
          )
        )

        // 更新布局节点数据
        const updatedLayoutNodes = layoutNodes.map(node =>
          node.id === nodeId ? { ...node, content } : node
        )
        setLayoutNodes(updatedLayoutNodes)

        // 通过onChange回调通知父组件数据变更，让父组件处理保存
        const updatedData = {
          nodes: nodes.map(node =>
            node.id === nodeId ? { ...node, data: { ...node.data, content } } : node
          ),
          edges,
        }
        onChange?.(updatedData)
      },
      [setNodes, layoutNodes, nodes, edges, onChange]
    )

    const handleSave = useCallback(async () => {
      // 通过回调通知父组件保存数据，不再直接操作数据库
      const data = { nodes, edges }
      onChange?.(data)
      onSave?.(data)
    }, [nodes, edges, onChange, onSave])

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

    // 暴露方法给父组件
    useImperativeHandle(
      ref,
      () => ({
        addNode,
        deleteSelected,
        save: handleSave,
      }),
      [addNode, deleteSelected, handleSave]
    )

    // 初始化布局节点
    useEffect(() => {
      // 如果有初始数据（从数据库加载）
      if (finalInitialNodes.length > 0 && layoutNodes.length === 0) {
        const initialLayoutNodes: LayoutNode[] = finalInitialNodes.map(node => {
          const nodeData = node.data as Record<string, unknown>
          return {
            id: node.id,
            parent_node_id: (nodeData?.parent_node_id as string) || null,
            sort_order: (nodeData?.sort_order as number) || 0,
            node_level: (nodeData?.node_level as number) || 0,
            content: String(nodeData?.content || ''),
          }
        })
        setLayoutNodes(initialLayoutNodes)

        // 自动选中主节点（根节点）
        const mainNode = initialLayoutNodes.find(node => node.parent_node_id === null)
        if (mainNode) {
          setTimeout(() => {
            setSelectedNodes([mainNode.id])
            // 确保ReactFlow也知道这个选择状态
            setNodes(prevNodes =>
              prevNodes.map(node => ({
                ...node,
                selected: node.id === mainNode.id,
              }))
            )
          }, 100)
        }
      }
      // 如果没有初始数据，创建默认根节点
      else if (layoutNodes.length === 0 && finalInitialNodes.length === 0) {
        const rootNode: LayoutNode = {
          id: crypto.randomUUID(),
          parent_node_id: null,
          sort_order: 0,
          node_level: 0,
          content: '中心主题',
        }
        setLayoutNodes([rootNode])
        applyAutoLayout([rootNode])

        // 自动选中新创建的主节点
        setTimeout(() => {
          setSelectedNodes([rootNode.id])
          // 确保ReactFlow也知道这个选择状态
          setNodes(prevNodes =>
            prevNodes.map(node => ({
              ...node,
              selected: node.id === rootNode.id,
            }))
          )
        }, 100)
      }
    }, [finalInitialNodes, layoutNodes.length, applyAutoLayout])

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
        {showToolbar && (
          <MindMapToolbar
            onAddNode={addNode}
            onDeleteSelected={deleteSelected}
            onSave={handleSave}
            onAIAssist={() => setShowAIAssistant(true)}
            hasSelection={selectedNodes.length > 0 || selectedEdges.length > 0}
            selectedNodeCount={selectedNodes.length}
          />
        )}

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
          onSelectionChange={onSelectionChangeCallback}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#2a2a27" />
        </ReactFlow>
      </div>
    )
  }
)

MindMapComponent.displayName = 'MindMap'

export const MindMap = MindMapComponent

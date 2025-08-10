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
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import {
  calculateAutoLayout,
  generateEdges,
  getNextSortOrder,
  getNodeLevel,
  type LayoutNode,
} from '@/lib/auto-layout'
import { TestIdGenerator, type NodeStructureInfo } from '@/lib/test-id-generator'
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
    const [testIdGenerator] = useState(() => new TestIdGenerator())
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isInEditMode, setIsInEditMode] = useState(false)
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

        // 为每个布局节点生成test-id
        layoutNodesList.forEach(layoutNode => {
          if (!testIdGenerator.getTestId(layoutNode.id)) {
            const nodeStructureInfo: NodeStructureInfo = {
              id: layoutNode.id,
              parentId: layoutNode.parent_node_id,
              isFloating: false, // TODO: 后续支持浮动节点时可以调整
              sortOrder: layoutNode.sort_order
            }
            testIdGenerator.registerNode(nodeStructureInfo, layoutNode.content)
          }
        })

        // 更新ReactFlow节点
        const reactFlowNodes: Node[] = layoutNodesList.map(layoutNode => {
          const testId = testIdGenerator.getTestId(layoutNode.id)
          const nodeInfo = testIdGenerator.getNodeInfo(layoutNode.id)
          
          return {
            id: layoutNode.id,
            type: 'mindMapNode',
            position: positions[layoutNode.id] || { x: 0, y: 0 },
            data: {
              content: layoutNode.content,
              isEditing: false,
              testId,
              nodeRole: nodeInfo?.parentId ? 'child' : 'root',
              nodeLevel: nodeInfo?.level || 0,
              isFloating: nodeInfo?.isFloating || false,
            },
          }
        })

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
      [setNodes, setEdges, onChange, testIdGenerator]
    )

    const addNode = useCallback(async () => {
      try {
        const selectedNodeId = selectedNodes.length === 1 ? selectedNodes[0] : null
        const parentNodeId = selectedNodeId
        const sortOrder = getNextSortOrder(layoutNodes, parentNodeId)
        const nodeLevel = getNodeLevel(layoutNodes, parentNodeId)

        // 创建新的布局节点
        const newNodeId = crypto.randomUUID()
        const newLayoutNode: LayoutNode = {
          id: newNodeId,
          parent_node_id: parentNodeId,
          sort_order: sortOrder,
          node_level: nodeLevel,
          content: '新节点',
        }

        // 为新节点生成test-id
        const nodeStructureInfo: NodeStructureInfo = {
          id: newNodeId,
          parentId: parentNodeId,
          isFloating: false,
          sortOrder: sortOrder
        }
        const testId = testIdGenerator.registerNode(nodeStructureInfo, '新节点')
        console.log(`创建新节点: UUID=${newNodeId}, TestId=${testId}`)

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
            setSelectedNodes([newNodeId])
            // 确保ReactFlow也知道这个选择状态
            setNodes(prevNodes =>
              prevNodes.map(node => ({
                ...node,
                selected: node.id === newNodeId,
              }))
            )
          }, 100)
        }

        // TODO: 通过API保存节点数据，而不是直接调用数据库
        // 当前由页面级的onChange处理保存逻辑
      } catch (error) {
        console.error('添加节点失败:', error)
      }
    }, [selectedNodes, layoutNodes, applyAutoLayout, testIdGenerator, setNodes])

    // 添加同级节点（Enter键功能）
    const addSiblingNode = useCallback(async () => {
      try {
        const selectedNodeId = selectedNodes.length === 1 ? selectedNodes[0] : null
        if (!selectedNodeId) return

        const selectedLayoutNode = layoutNodes.find(node => node.id === selectedNodeId)
        if (!selectedLayoutNode) return

        // 为同级节点找到父节点ID和新的排序顺序
        const parentNodeId = selectedLayoutNode.parent_node_id
        const nodeLevel = selectedLayoutNode.node_level

        // 如果是根节点，创建另一个根级节点
        const sortOrder = getNextSortOrder(layoutNodes, parentNodeId)

        const newNodeId = crypto.randomUUID()
        const newLayoutNode: LayoutNode = {
          id: newNodeId,
          parent_node_id: parentNodeId,
          sort_order: sortOrder,
          node_level: nodeLevel,
          content: '新节点',
        }

        // 生成test-id
        const nodeStructureInfo: NodeStructureInfo = {
          id: newNodeId,
          parentId: parentNodeId,
          isFloating: false,
          sortOrder: sortOrder
        }
        const testId = testIdGenerator.registerNode(nodeStructureInfo, '新节点')
        console.log(`创建同级节点: UUID=${newNodeId}, TestId=${testId}`)

        // 更新布局节点列表
        const updatedLayoutNodes = [...layoutNodes, newLayoutNode]
        setLayoutNodes(updatedLayoutNodes)

        // 应用自动布局
        applyAutoLayout(updatedLayoutNodes)

        // 选中新创建的节点
        setTimeout(() => {
          setSelectedNodes([newNodeId])
          setNodes(prevNodes =>
            prevNodes.map(node => ({
              ...node,
              selected: node.id === newNodeId,
            }))
          )
        }, 100)
      } catch (error) {
        console.error('添加同级节点失败:', error)
      }
    }, [selectedNodes, layoutNodes, applyAutoLayout, testIdGenerator, setNodes])

    const deleteSelected = useCallback(async () => {
      if (selectedNodes.length === 0) return

      // 检查是否试图删除根节点
      const nodeToDelete = layoutNodes.find(node => 
        selectedNodes.includes(node.id) && node.parent_node_id === null
      )
      
      if (nodeToDelete) {
        // 显示根节点保护提示
        // 创建自定义事件来显示提示信息
        const event = new CustomEvent('showMessage', {
          detail: { message: '根节点不能被删除', type: 'warning' }
        })
        window.dispatchEvent(event)
        return
      }

      // 显示删除确认对话框
      setShowDeleteDialog(true)
    }, [selectedNodes, layoutNodes])

    // 确认删除操作
    const confirmDelete = useCallback(async () => {
      try {
        // 获取要删除节点的父节点，用于删除后的焦点设置
        const nodesToDelete = layoutNodes.filter(node => selectedNodes.includes(node.id))
        const parentNodeId = nodesToDelete[0]?.parent_node_id

        // 从TestIdGenerator中移除节点
        selectedNodes.forEach(nodeId => {
          const testId = testIdGenerator.getTestId(nodeId)
          console.log(`删除节点: UUID=${nodeId}, TestId=${testId}`)
          testIdGenerator.removeNode(nodeId)
        })

        // 递归删除子节点
        const deleteNodeAndChildren = (nodeId: string): string[] => {
          const childNodes = layoutNodes.filter(node => node.parent_node_id === nodeId)
          let deletedNodeIds = [nodeId]
          
          childNodes.forEach(childNode => {
            deletedNodeIds = [...deletedNodeIds, ...deleteNodeAndChildren(childNode.id)]
          })
          
          return deletedNodeIds
        }

        let allNodesToDelete: string[] = []
        selectedNodes.forEach(nodeId => {
          allNodesToDelete = [...allNodesToDelete, ...deleteNodeAndChildren(nodeId)]
        })

        // 更新布局节点数据
        const updatedLayoutNodes = layoutNodes.filter(node => !allNodesToDelete.includes(node.id))
        setLayoutNodes(updatedLayoutNodes)

        // 重新应用布局
        applyAutoLayout(updatedLayoutNodes)

        // 将焦点移动到父节点
        if (parentNodeId) {
          setTimeout(() => {
            setSelectedNodes([parentNodeId])
            setNodes(prevNodes =>
              prevNodes.map(node => ({
                ...node,
                selected: node.id === parentNodeId,
              }))
            )
          }, 100)
        } else {
          setSelectedNodes([])
        }

        setShowDeleteDialog(false)
      } catch (error) {
        console.error('删除节点失败:', error)
        setShowDeleteDialog(false)
      }
    }, [selectedNodes, layoutNodes, applyAutoLayout, testIdGenerator, setNodes])

    const updateNodeContent = useCallback(
      async (nodeId: string, content: string) => {
        // 更新TestIdGenerator中的节点内容
        testIdGenerator.updateNodeContent(nodeId, content)

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
      [setNodes, layoutNodes, nodes, edges, onChange, testIdGenerator]
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

    // 节点导航功能
    const navigateToNode = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
      if (selectedNodes.length !== 1 || isInEditMode) return

      const currentNodeId = selectedNodes[0]
      const currentLayoutNode = layoutNodes.find(node => node.id === currentNodeId)
      if (!currentLayoutNode) return

      let targetNodeId: string | null = null

      switch (direction) {
        case 'left': // 导航到父节点
          targetNodeId = currentLayoutNode.parent_node_id
          break
        
        case 'right': // 导航到第一个子节点
          const firstChild = layoutNodes
            .filter(node => node.parent_node_id === currentNodeId)
            .sort((a, b) => a.sort_order - b.sort_order)[0]
          targetNodeId = firstChild?.id || null
          break
        
        case 'up': // 导航到上一个同级节点
          const siblings = layoutNodes
            .filter(node => node.parent_node_id === currentLayoutNode.parent_node_id)
            .sort((a, b) => a.sort_order - b.sort_order)
          const currentIndex = siblings.findIndex(node => node.id === currentNodeId)
          const prevSibling = siblings[currentIndex - 1]
          targetNodeId = prevSibling?.id || null
          break
        
        case 'down': // 导航到下一个同级节点
          const downSiblings = layoutNodes
            .filter(node => node.parent_node_id === currentLayoutNode.parent_node_id)
            .sort((a, b) => a.sort_order - b.sort_order)
          const downCurrentIndex = downSiblings.findIndex(node => node.id === currentNodeId)
          const nextSibling = downSiblings[downCurrentIndex + 1]
          targetNodeId = nextSibling?.id || null
          break
      }

      // 如果找到目标节点，选中它
      if (targetNodeId) {
        setSelectedNodes([targetNodeId])
        setNodes(prevNodes =>
          prevNodes.map(node => ({
            ...node,
            selected: node.id === targetNodeId,
          }))
        )
      }
    }, [selectedNodes, layoutNodes, isInEditMode, setNodes])

    // 进入编辑模式
    const enterEditMode = useCallback(() => {
      if (selectedNodes.length !== 1) return

      const selectedNodeId = selectedNodes[0]
      const nodeElement = document.querySelector(`[data-testid="rf__node-${selectedNodeId}"]`)
      if (nodeElement) {
        // 触发双击事件进入编辑模式
        const event = new MouseEvent('dblclick', { bubbles: true })
        nodeElement.dispatchEvent(event)
      }
    }, [selectedNodes])

    // 键盘事件处理
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
      // 如果显示对话框，不处理快捷键
      if (showDeleteDialog || showAIAssistant) return

      // 检查是否在编辑模式（任何输入框获得焦点）
      const isEditingNow = document.activeElement?.tagName === 'INPUT' || 
                          document.activeElement?.tagName === 'TEXTAREA' ||
                          (document.activeElement as HTMLElement)?.contentEditable === 'true'
      
      setIsInEditMode(isEditingNow)

      // 在编辑模式下，只处理Escape键
      if (isEditingNow) {
        if (event.key === 'Escape') {
          // 退出编辑模式，触发blur事件
          if (document.activeElement && 'blur' in document.activeElement) {
            (document.activeElement as HTMLElement).blur()
          }
          event.preventDefault()
          event.stopPropagation()
        }
        return
      }

      // 非编辑模式下的快捷键处理
      if (selectedNodes.length === 0) return

      switch (event.key) {
        case 'Tab':
          event.preventDefault()
          addNode()
          break
        
        case 'Enter':
          event.preventDefault()
          addSiblingNode()
          break
        
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          deleteSelected()
          break
        
        case 'F2':
          event.preventDefault()
          enterEditMode()
          break
        
        case 'ArrowUp':
          event.preventDefault()
          navigateToNode('up')
          break
        
        case 'ArrowDown':
          event.preventDefault()
          navigateToNode('down')
          break
        
        case 'ArrowLeft':
          event.preventDefault()
          navigateToNode('left')
          break
        
        case 'ArrowRight':
          event.preventDefault()
          navigateToNode('right')
          break
      }
    }, [selectedNodes, showDeleteDialog, showAIAssistant, addNode, addSiblingNode, deleteSelected, enterEditMode, navigateToNode])

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
          const layoutNode = {
            id: node.id,
            parent_node_id: (nodeData?.parent_node_id as string) || null,
            sort_order: (nodeData?.sort_order as number) || 0,
            node_level: (nodeData?.node_level as number) || 0,
            content: String(nodeData?.content || ''),
          }

          // 为每个节点注册到TestIdGenerator
          const nodeStructureInfo: NodeStructureInfo = {
            id: node.id,
            parentId: layoutNode.parent_node_id,
            isFloating: false,
            sortOrder: layoutNode.sort_order
          }
          const testId = testIdGenerator.registerNode(nodeStructureInfo, layoutNode.content)
          console.log(`注册节点: UUID=${node.id}, TestId=${testId}, Content=${layoutNode.content}`)

          return layoutNode
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
        const rootNodeId = crypto.randomUUID()
        const rootNode: LayoutNode = {
          id: rootNodeId,
          parent_node_id: null,
          sort_order: 0,
          node_level: 0,
          content: '中心主题',
        }

        // 为根节点生成test-id
        const nodeStructureInfo: NodeStructureInfo = {
          id: rootNodeId,
          parentId: null,
          isFloating: false,
          sortOrder: 0
        }
        const testId = testIdGenerator.registerNode(nodeStructureInfo, '中心主题')
        console.log(`创建根节点: UUID=${rootNodeId}, TestId=${testId}`)

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
    }, [finalInitialNodes, layoutNodes.length, applyAutoLayout, setNodes, testIdGenerator])

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

    // 键盘事件监听
    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown)
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [handleKeyDown])

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

        {/* 删除确认对话框 */}
        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={confirmDelete}
        />
      </div>
    )
  }
)

MindMapComponent.displayName = 'MindMap'

export const MindMap = MindMapComponent

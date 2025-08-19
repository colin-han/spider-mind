import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/database-postgres'
import { mindMapTransformer } from '@/lib/services/mindmap-transformer'
import type { ApiResponse, MindMapInfo, UpdateMindMapInput } from '@/lib/types/mindmap-data'

// 获取单个思维导图
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // 从数据库中查找
    const mindMap = await MindMapService.getMindMap(id)

    if (!mindMap) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 将数据库格式转换为标准数据模型
    const standardMindMap = mindMapTransformer.fromDatabase(
      mindMap as unknown as Record<string, unknown>,
      []
    )

    return NextResponse.json<ApiResponse<MindMapInfo>>({
      success: true,
      data: standardMindMap.mindmap,
    })
  } catch (error) {
    console.error('Failed to get mind map:', error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: '获取思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 更新思维导图
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // 检查思维导图是否存在
    const existingMindMap = await MindMapService.getMindMap(id)
    if (!existingMindMap) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 验证请求数据格式
    let updateInput: UpdateMindMapInput

    if (body.mindmap && body.nodes) {
      // 完整的数据模型格式
      updateInput = body.mindmap
    } else {
      // 传统格式兼容
      updateInput = {
        title: body.title,
        is_public: body.is_public,
      }
    }

    // 准备更新数据
    const updateData = {
      ...updateInput,
      updated_at: new Date().toISOString(),
    }

    let updatedMindMap
    if (body.content) {
      // 如果包含ReactFlow格式的content，使用传统的更新方法
      updatedMindMap = await MindMapService.updateMindMapWithNodes(id, updateData, body.content)
    } else {
      // 仅更新基本信息
      updatedMindMap = await MindMapService.updateMindMap(id, updateData)
    }

    return NextResponse.json<ApiResponse<MindMapInfo>>({
      success: true,
      message: '思维导图更新成功',
      data: updatedMindMap,
    })
  } catch (error) {
    console.error('Failed to update mind map:', error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: '更新思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 删除思维导图
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // 检查思维导图是否存在
    const existingMindMap = await MindMapService.getMindMap(id)

    if (!existingMindMap) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 删除思维导图（级联删除节点）
    await MindMapService.deleteMindMap(id)

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '思维导图删除成功',
    })
  } catch (error) {
    console.error('Delete operation failed:', error)

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: '删除思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

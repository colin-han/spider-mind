import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/database-postgres'

// 获取单个思维导图
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // 从数据库中查找
    const mindMap = await MindMapService.getMindMap(id)

    if (!mindMap) {
      return NextResponse.json(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mindMap,
    })
  } catch (error) {
    console.error('Failed to get mind map:', error)
    return NextResponse.json(
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
      return NextResponse.json(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 准备更新数据
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    // 在单个事务中更新思维导图并同步节点数据（如果有的话）
    const updatedMindMap = await MindMapService.updateMindMapWithNodes(id, updateData, body.content)

    return NextResponse.json({
      success: true,
      message: '思维导图更新成功',
      data: updatedMindMap,
    })
  } catch (error) {
    console.error('Failed to update mind map:', error)
    return NextResponse.json(
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
      return NextResponse.json(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 删除思维导图（级联删除节点）
    await MindMapService.deleteMindMap(id)

    return NextResponse.json({
      success: true,
      message: '思维导图删除成功',
    })
  } catch (error) {
    console.error('Delete operation failed:', error)

    return NextResponse.json(
      {
        success: false,
        message: '删除思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

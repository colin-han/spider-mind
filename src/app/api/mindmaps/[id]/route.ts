import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/local-database'

// 获取单个思维导图
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mindMap = await MindMapService.getMindMap(params.id)
    
    if (!mindMap) {
      return NextResponse.json({
        success: false,
        message: '思维导图不存在'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: mindMap
    })
  } catch (error) {
    console.error('Failed to get mind map:', error)
    return NextResponse.json({
      success: false,
      message: '获取思维导图失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 更新思维导图
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const updatedMindMap = await MindMapService.updateMindMap(params.id, {
      title: body.title,
      content: body.content,
      is_public: body.is_public
    })
    
    return NextResponse.json({
      success: true,
      message: '思维导图更新成功',
      data: updatedMindMap
    })
  } catch (error) {
    console.error('Failed to update mind map:', error)
    return NextResponse.json({
      success: false,
      message: '更新思维导图失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 删除思维导图
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await MindMapService.deleteMindMap(params.id)
    
    return NextResponse.json({
      success: true,
      message: '思维导图删除成功'
    })
  } catch (error) {
    console.error('Failed to delete mind map:', error)
    return NextResponse.json({
      success: false,
      message: '删除思维导图失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
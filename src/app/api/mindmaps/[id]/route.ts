import { NextRequest, NextResponse } from 'next/server'

interface MindMap {
  id: string
  title: string
  content: Record<string, unknown>
  user_id: string
  is_public: boolean
  created_at: string
  updated_at: string
}

// 导入内存存储（模拟外部导入）
declare global {
  var mindMapsStorage: MindMap[]
}

if (!global.mindMapsStorage) {
  global.mindMapsStorage = []
}

// 获取单个思维导图
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // 从内存存储中查找
    let mindMap = global.mindMapsStorage.find(map => map.id === id)

    if (!mindMap) {
      // 如果没有找到，创建一个默认的思维导图
      mindMap = {
        id: id,
        title: '新思维导图',
        content: {
          nodes: [
            {
              id: crypto.randomUUID(),
              type: 'mindMapNode',
              position: { x: 400, y: 300 },
              data: { content: '新思维导图', isEditing: false },
              selected: true, // 默认选中主节点
            },
          ],
          edges: [],
        },
        user_id: '11111111-1111-1111-1111-111111111111',
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // 保存到全局存储
      global.mindMapsStorage.push(mindMap)
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

    // 简单返回更新成功
    return NextResponse.json({
      success: true,
      message: '思维导图更新成功',
      data: { id: id, ...body, updated_at: new Date().toISOString() },
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
    const mindMapIndex = global.mindMapsStorage.findIndex(map => map.id === id)

    if (mindMapIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: '思维导图不存在',
        },
        { status: 404 }
      )
    }

    // 从内存存储中删除
    global.mindMapsStorage.splice(mindMapIndex, 1)

    return NextResponse.json({
      success: true,
      message: '思维导图删除成功',
    })
  } catch (error) {
    console.error('Failed to delete mind map:', error)
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

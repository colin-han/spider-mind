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

// 声明全局内存存储
declare global {
  var mindMapsStorage: MindMap[]
}

if (!global.mindMapsStorage) {
  global.mindMapsStorage = []
}

// 获取所有思维导图
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || '11111111-1111-1111-1111-111111111111' // 默认用户

    // 过滤用户的思维导图
    const userMindMaps = global.mindMapsStorage.filter(mindMap => mindMap.user_id === userId)

    return NextResponse.json({
      success: true,
      data: userMindMaps,
    })
  } catch (error) {
    console.error('Failed to get mind maps:', error)
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

// 创建新思维导图
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const title = body.title || '新思维导图'
    const mindMapId = crypto.randomUUID()

    // 创建思维导图对象
    const mindMap: MindMap = {
      id: mindMapId,
      title,
      content: {
        nodes: [
          {
            id: crypto.randomUUID(),
            type: 'mindMapNode',
            position: { x: 400, y: 300 },
            data: { content: title, isEditing: false },
          },
        ],
        edges: [],
      },
      user_id: body.userId || '11111111-1111-1111-1111-111111111111',
      is_public: body.is_public || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 保存到全局内存存储
    global.mindMapsStorage.push(mindMap)

    return NextResponse.json({
      success: true,
      message: '思维导图创建成功',
      data: mindMap,
    })
  } catch (error) {
    console.error('Failed to create mind map:', error)
    return NextResponse.json(
      {
        success: false,
        message: '创建思维导图失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

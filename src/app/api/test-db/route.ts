import { NextRequest, NextResponse } from 'next/server'
import { MindMapService } from '@/lib/database-postgres'

export async function GET() {
  try {
    // 测试获取所有思维导图
    const mindMaps = await MindMapService.getUserMindMaps('11111111-1111-1111-1111-111111111111')

    return NextResponse.json({
      success: true,
      message: '数据库连接正常',
      data: {
        mindMapsCount: mindMaps?.length || 0,
        mindMaps: mindMaps || [],
      },
    })
  } catch (error) {
    console.error('Database test failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: '数据库连接失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 创建测试思维导图
    const mindMap = await MindMapService.createMindMap({
      title: body.title || '测试思维导图',
      user_id: '11111111-1111-1111-1111-111111111111',
      is_public: false,
    })

    return NextResponse.json({
      success: true,
      message: '思维导图创建成功',
      data: mindMap,
    })
  } catch (error) {
    console.error('Mind map creation failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: '思维导图创建失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

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

// 批量删除所有思维导图
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || '11111111-1111-1111-1111-111111111111'

    // 找到用户的所有思维导图
    const userMindMaps = global.mindMapsStorage.filter(map => map.user_id === userId)
    const deleteCount = userMindMaps.length

    // 从存储中移除用户的所有思维导图
    global.mindMapsStorage = global.mindMapsStorage.filter(map => map.user_id !== userId)

    console.log(`批量删除用户 ${userId} 的 ${deleteCount} 个思维导图`)
    
    return NextResponse.json({
      success: true,
      message: `成功删除 ${deleteCount} 个思维导图`,
      deletedCount: deleteCount,
      remainingTotal: global.mindMapsStorage.length
    })
  } catch (error) {
    console.error('批量删除思维导图失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '批量删除失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}